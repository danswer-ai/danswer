import json
import re
from datetime import datetime
from typing import Any

from langchain_core.messages import HumanMessage
from langchain_core.messages import merge_message_runs

from danswer.agent_search.primary_graph.prompts import ENTITY_TERM_PROMPT
from danswer.agent_search.primary_graph.states import QAState
from danswer.agent_search.shared_graph_utils.utils import format_docs
from danswer.agent_search.shared_graph_utils.utils import generate_log_message
from danswer.llm.factory import get_default_llms


def entity_term_extraction(state: QAState) -> dict[str, Any]:
    """Extract entities and terms from the question and context"""
    node_start_time = datetime.now()

    question = state["original_question"]
    docs = state["deduped_retrieval_docs"]

    doc_context = format_docs(docs)

    msg = [
        HumanMessage(
            content=ENTITY_TERM_PROMPT.format(question=question, context=doc_context),
        )
    ]
    _, fast_llm = get_default_llms()
    # Grader
    llm_response_list = list(
        fast_llm.stream(
            prompt=msg,
            # structured_response_format={"type": "json_object", "schema": RewrittenQueries.model_json_schema()},
            # structured_response_format=RewrittenQueries.model_json_schema(),
        )
    )
    llm_response = merge_message_runs(llm_response_list, chunk_separator="")[0].content

    cleaned_response = re.sub(r"```json\n|\n```", "", llm_response)
    parsed_response = json.loads(cleaned_response)

    return {
        "retrieved_entities_relationships": parsed_response,
        "log_messages": generate_log_message(
            message="deep - entity term extraction",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }
