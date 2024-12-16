import json
import re
from typing import Any

from langchain_core.messages import HumanMessage
from langchain_core.messages import merge_message_runs

from onyx.agent_search.main.states import MainState
from onyx.agent_search.shared_graph_utils.prompts import ENTITY_TERM_PROMPT
from onyx.agent_search.shared_graph_utils.utils import format_docs


def entity_term_extraction(state: MainState) -> dict[str, Any]:
    """Extract entities and terms from the question and context"""

    question = state["original_question"]
    docs = state["deduped_retrieval_docs"]

    doc_context = format_docs(docs)

    msg = [
        HumanMessage(
            content=ENTITY_TERM_PROMPT.format(question=question, context=doc_context),
        )
    ]
    fast_llm = state["fast_llm"]
    # Grader
    llm_response_list = list(
        fast_llm.stream(
            prompt=msg,
        )
    )
    llm_response = merge_message_runs(llm_response_list, chunk_separator="")[0].content

    cleaned_response = re.sub(r"```json\n|\n```", "", llm_response)
    parsed_response = json.loads(cleaned_response)

    return {
        "retrieved_entities_relationships": parsed_response,
    }
