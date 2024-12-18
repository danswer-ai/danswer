from onyx.agent_search.answer_question.states import AnswerQuestionOutput
from onyx.agent_search.main.states import DecompAnswersUpdate
from onyx.agent_search.shared_graph_utils.operators import dedup_inference_sections


def ingest_answers(state: AnswerQuestionOutput) -> DecompAnswersUpdate:
    documents = []
    for answer_result in state["answer_results"]:
        documents.extend(answer_result.documents)
    return DecompAnswersUpdate(
        # Deduping is done by the documents operator for the main graph
        # so we might not need to dedup here
        documents=dedup_inference_sections(documents, []),
        decomp_answer_results=state["answer_results"],
    )
