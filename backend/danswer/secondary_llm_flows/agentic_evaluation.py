from danswer.chat.models import RelevanceChunk
from danswer.llm.interfaces import LLM
from danswer.llm.utils import message_to_string
from danswer.prompts.miscellaneous_prompts import AGENTIC_SEARCH_EVALUATION_PROMPT
from danswer.search.models import InferenceSection
from danswer.utils.logger import setup_logger

logger = setup_logger()


def evaluate_inference_section(
    document: InferenceSection, query: str, llm: LLM
) -> dict[str, RelevanceChunk]:
    relevance: RelevanceChunk = RelevanceChunk()
    results = {}

    # At least for now, is the same doucment ID across chunks
    document_id = document.center_chunk.document_id
    chunk_id = document.center_chunk.chunk_id

    prompt = AGENTIC_SEARCH_EVALUATION_PROMPT.format(
        document_title=document_id.split("/")[-1],
        content=document.combined_content,
        query=query,
    )
    print(prompt)
    content = message_to_string(llm.invoke(prompt=prompt))
    analysis = ""
    relevant = False
    chain_of_thought = ""

    parts = content.split("[ANALYSIS_START]", 1)
    if len(parts) == 2:
        chain_of_thought, rest = parts
    else:
        logger.warning(f"Missing [ANALYSIS_START] tag for document {document_id}")
        rest = content

    parts = rest.split("[ANALYSIS_END]", 1)
    if len(parts) == 2:
        analysis, result = parts
    else:
        logger.warning(f"Missing [ANALYSIS_END] tag for document {document_id}")
        result = rest

    chain_of_thought = chain_of_thought.strip()
    analysis = analysis.strip()
    result = result.strip().lower()

    # Determine relevance
    if "result: true" in result:
        relevant = True
    elif "result: false" in result:
        relevant = False
    else:
        logger.warning(f"Invalid result format for document {document_id}")

    if not analysis:
        logger.warning(
            f"Couldn't extract proper analysis for document {document_id}. Using full content."
        )
        analysis = content

    relevance.content = analysis
    relevance.relevant = relevant

    results[f"{document_id}-{chunk_id}"] = relevance
    return results
