REWRITE_PROMPT_MULTI = """\n
    Please convert an initial user question into a 2-3 more appropriate
    search queries for retrievel from a document store.\n
    Here is the initial question:
    \n ------- \n
    {question}
    \n ------- \n

    Formulate the query:
"""

REWRITE_PROMPT_SINGLE = """\n
    Please convert an initial user question into a more appropriate search
    query for retrievel from a document store.\n
    Here is the initial question:
    \n ------- \n
    {question}
    \n ------- \n

    Formulate the query:
"""


BASE_RAG_PROMPT = """\n
    You are an assistant for question-answering tasks.
    Use the following pieces of retrieved context to answer the question.
    If you don't know the answer, just say that you don't know.
    Use three sentences maximum and keep the answer concise.
    \nQuestion: {question}
    \nContext: {context}
    \nAnswer:
"""

MODIFIED_RAG_PROMPT = """You are an assistant for question-answering tasks.
    Use the following pieces of retrieved context to answer the question.
    If you don't know the answer, just say that you don't know.
    Use three sentences maximum and keep the answer concise.
    Pay also particular attention to the sub-questions and their answers,
    at least it may enrich the answer.
    \nQuestion: {question}
    \nContext: {combined_context}
    \nAnswer:
"""

BASE_CHECK_PROMPT = """\n
    Please check whether the suggested answer seems to address the original question. Please only answer with 'yes' or 'no'\n
    Here is the initial question:
    \n ------- \n
    {question}
    \n ------- \n
    Here is the proposed answer:
    \n ------- \n
    {base_answer}
    \n ------- \n
    Please answer with yes or no:
"""


VERIFIER_PROMPT = """\n
    Please check whether the document seems to be relevant for the
    answer of the original question. Please only answer with 'yes' or 'no'\n
    Here is the initial question:
    \n ------- \n
    {question}
    \n ------- \n
    Here is the document text:
    \n ------- \n
    {document_content}
    \n ------- \n
    Please answer with yes or no:
"""

DECOMPOSE_PROMPT = """\n
    For an initial user question, please generate at least two but not
    more than 3 individual sub-questions whose answers would help\n
    to answer the initial question. The individual questions should be
    answerable by a good RAG system. So a good idea would be to\n
    use the sub-questions to resolve ambiguities and/or to separate the
    question for different entities that may be involved in the original question.

    Guidelines:
    - The sub-questions should be specific to the question and provide
    richer context for the question, and or resolve ambiguities
    - Each sub-question - when answered - should be relevant for the
    answer to the original question
    - The sub-questions MUST have the full context of the original
    question so that it can be executed by a RAG system independently
    without the original question available
      (Example:
        - initial question: "What is the capital of France?"
        - bad sub-question: "What is the name of the river there?"
        - good sub-question: "What is the name of the river that flows
        through Paris?"

    \n\n
    Here is the initial question:
    \n ------- \n
    {question}
    \n ------- \n
    Please generate the list of good, fully contextualized sub-questions.
    Think through it step by step and then generate the list.
"""


#### Consolidations
COMBINED_CONTEXT = """
    -------
    Below you will find useful information to answer the original question.
    First, you see a number of sub-questions with their answers.
    This information should be considered to be more focussed and
    somewhat more specific to the original question as it tries to
    contextualized facts.
    After that will see the documents that were considered to be
    relevant to answer the original question.

    Here are the sub-questions and their answers:
    \n\n {deep_answer_context} \n\n
    \n\n Here are the documents that were considered to be relevant to
    answer the original question:
    \n\n {formated_docs} \n\n
    ----------------
"""
