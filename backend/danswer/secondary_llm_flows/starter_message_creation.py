import json
import re

from litellm import get_supported_openai_params
from sqlalchemy.orm import Session

from danswer.configs.chat_configs import NUM_PERSONA_PROMPT_GENERATION_CHUNKS
from danswer.configs.chat_configs import NUM_PERSONA_PROMPTS
from danswer.db.document_set import get_document_sets_by_ids
from danswer.db.models import StarterMessageModel as StarterMessage
from danswer.db.models import User
from danswer.document_index.document_index_utils import get_both_index_names
from danswer.document_index.factory import get_default_document_index
from danswer.llm.factory import get_default_llms
from danswer.prompts.starter_messages import PERSONA_STARTER_MESSAGE_CREATION_PROMPT
from danswer.search.models import IndexFilters
from danswer.search.models import InferenceChunk
from danswer.search.postprocessing.postprocessing import cleanup_chunks
from danswer.search.preprocessing.access_filters import build_access_filters_for_user
from danswer.utils.logger import setup_logger
from danswer.utils.threadpool_concurrency import FunctionCall
from danswer.utils.threadpool_concurrency import run_functions_in_parallel


logger = setup_logger()


def get_random_chunks_from_doc_sets(
    doc_sets: list[str], db_session: Session, user: User | None = None
) -> list[InferenceChunk]:
    curr_ind_name, sec_ind_name = get_both_index_names(db_session)
    document_index = get_default_document_index(curr_ind_name, sec_ind_name)

    acl_filters = build_access_filters_for_user(user, db_session)
    filters = IndexFilters(document_set=doc_sets, access_control_list=acl_filters)

    chunks = document_index.random_retrieval(
        filters=filters, num_to_retrieve=NUM_PERSONA_PROMPT_GENERATION_CHUNKS
    )
    return cleanup_chunks(chunks)


def generate_starter_messages(
    name: str,
    description: str,
    instructions: str,
    document_set_ids: list[int],
    db_session: Session,
    user: User | None,
) -> list[StarterMessage]:
    start_message_generation_prompt = PERSONA_STARTER_MESSAGE_CREATION_PROMPT.format(
        name=name, description=description, instructions=instructions
    )
    _, fast_llm = get_default_llms(temperature=0.8)

    provider = fast_llm.config.model_provider
    model = fast_llm.config.model_name

    params = get_supported_openai_params(model=model, custom_llm_provider=provider)
    supports_structured_output = (
        isinstance(params, list) and "response_format" in params
    )

    prompts: list[StarterMessage] = []

    if document_set_ids:
        document_sets = get_document_sets_by_ids(
            document_set_ids=document_set_ids,
            db_session=db_session,
        )

        chunks = get_random_chunks_from_doc_sets(
            doc_sets=[doc_set.name for doc_set in document_sets],
            db_session=db_session,
            user=user,
        )

        # Add example content context to the prompt
        chunk_contents = "\n".join(chunk.content.strip() for chunk in chunks)

        start_message_generation_prompt += (
            "\n\nExample content this assistant has access to:\n"
            "'''\n"
            f"{chunk_contents}"
            "\n'''"
        )

    if supports_structured_output:
        functions = [
            FunctionCall(
                fast_llm.invoke,
                (start_message_generation_prompt, None, None, StarterMessage),
            )
            for _ in range(NUM_PERSONA_PROMPTS)
        ]
    else:
        functions = [
            FunctionCall(
                fast_llm.invoke,
                (start_message_generation_prompt,),
            )
            for _ in range(NUM_PERSONA_PROMPTS)
        ]

    results = run_functions_in_parallel(function_calls=functions)
    for response in results.values():
        try:
            if supports_structured_output:
                response_dict = json.loads(response.content)
            else:
                response_dict = parse_unstructured_output(response.content)
            starter_message = StarterMessage(
                name=response_dict["name"],
                description=response_dict["description"],
                message=response_dict["message"],
            )
            prompts.append(starter_message)
        except json.JSONDecodeError as e:
            logger.error(f"JSON decoding failed: {e}")
            continue

    return prompts


def parse_unstructured_output(output: str) -> dict[str, str]:
    """
    Parses the assistant's unstructured output into a dictionary with keys:
    - 'name'
    - 'description'
    - 'message'
    """
    # Use regular expressions to extract the required sections
    name_match = re.search(r"(?i)1\.\s*Title\s*:\s*(.+)", output)
    description_match = re.search(r"(?i)2\.\s*Description\s*:\s*(.+)", output)
    message_match = re.search(r"(?i)3\.\s*Message\s*:\s*(.+)", output)

    if not (name_match and description_match and message_match):
        raise ValueError("Failed to parse the assistant's response.")

    return {
        "name": name_match.group(1).strip(),
        "description": description_match.group(1).strip(),
        "message": message_match.group(1).strip(),
    }
