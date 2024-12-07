REWRITE_PROMPT_MULTI = """ \n
    Please convert an initial user question into a 2-3 more appropriate search queries for retrievel from a
    document store. \n
    Here is the initial question:
    \n ------- \n
    {question}
    \n ------- \n

    Formulate the query: """

BASE_RAG_PROMPT = """ \n
    You are an assistant for question-answering tasks. Use the context provided below - and only the
    provided context - to answer the question. If you don't know the answer or if the provided context is
    empty, just say "I don't know". Do not use your internal knowledge!

    Again, only use the provided context and do not use your internal knowledge! If you cannot answer the
    question based on the context, say "I don't know". It is a matter of life and death that you do NOT
    use your internal knowledge, just the provided information!

    Use three sentences maximum and keep the answer concise.
    answer concise.\nQuestion:\n {question} \nContext:\n {context} \n\n
    \n\n
    Answer:"""

BASE_CHECK_PROMPT = """ \n
    Please check whether 1) the suggested answer seems to fully address the original question AND 2)the
    original question requests a simple, factual answer, and there are no ambiguities, judgements,
    aggregations, or any other complications that may require extra context. (I.e., if the question is
    somewhat addressed, but the answer would benefit from more context, then answer with 'no'.)

    Please only answer with 'yes' or 'no' \n
    Here is the initial question:
    \n ------- \n
    {question}
    \n ------- \n
    Here is the proposed answer:
    \n ------- \n
    {base_answer}
    \n ------- \n
    Please answer with yes or no:"""

VERIFIER_PROMPT = """ \n
    Please check whether the document seems to be relevant for the answer of the original question. Please
    only answer with 'yes' or 'no' \n
    Here is the initial question:
    \n ------- \n
    {question}
    \n ------- \n
    Here is the document text:
    \n ------- \n
    {document_content}
    \n ------- \n
    Please answer with yes or no:"""

INITIAL_DECOMPOSITION_PROMPT_BASIC = """ \n
    Please decompose an initial user question into not more than 4 appropriate sub-questions that help to
    answer the original question. The purpose for this decomposition is to isolate individulal entities
    (i.e., 'compare sales of company A and company B' -> 'what are sales for company A' + 'what are sales
    for company B'), split ambiguous terms (i.e., 'what is our success with company A' -> 'what are our
    sales with company A' + 'what is our market share with company A' + 'is company A a reference customer
    for us'), etc. Each sub-question should be realistically be answerable by a good RAG system. \n

    Here is the initial question:
    \n ------- \n
    {question}
    \n ------- \n

    Please formulate your answer as a list of subquestions:

    Answer:
    """

REWRITE_PROMPT_SINGLE = """ \n
    Please convert an initial user question into a more appropriate search query for retrievel from a
    document store. \n
    Here is the initial question:
    \n ------- \n
    {question}
    \n ------- \n

    Formulate the query: """

MODIFIED_RAG_PROMPT = """You are an assistant for question-answering tasks. Use the context provided below
    - and only this context - to answer the question. If you don't know the answer, just say "I don't know".
    Use three sentences maximum and keep the answer concise.
    Pay also particular attention to the sub-questions and their answers, at least it may enrich the answer.
    Again, only use the provided context and do not use your internal knowledge! If you cannot answer the
    question based on the context, say "I don't know". It is a matter of life and death that you do NOT
    use your internal knowledge, just the provided information!

    \nQuestion: {question}
    \nContext: {combined_context} \n

    Answer:"""

ORIG_DEEP_DECOMPOSE_PROMPT = """ \n
    An initial user question needs to be answered. An initial answer has been provided but it wasn't quite
    good enough. Also, some sub-questions had been answered and this information has been used to provide
    the initial answer. Some other subquestions may have been suggested based on little knowledge, but they
    were not directly answerable. Also, some entities, relationships and terms are givenm to you so that
    you have an idea of how the avaiolable data looks like.

    Your role is to generate 3-5 new sub-questions that would help to answer the initial question,
    considering:

    1) The initial question
    2) The initial answer that was found to be unsatisfactory
    3) The sub-questions that were answered
    4) The sub-questions that were suggested but not answered
    5) The entities, relationships and terms that were extracted from the context

    The individual questions should be answerable by a good RAG system.
    So a good idea would be to use the sub-questions to resolve ambiguities and/or to separate the
    question for different entities that may be involved in the original question, but in a way that does
    not duplicate questions that were already tried.

    Additional Guidelines:
    - The sub-questions should be specific to the question and provide richer context for the question,
    resolve ambiguities, or address shortcoming of the initial answer
    - Each sub-question - when answered - should be relevant for the answer to the original question
    - The sub-questions should be free from comparisions, ambiguities,judgements, aggregations, or any
    other complications that may require extra context.
    - The sub-questions MUST have the full context of the original question so that it can be executed by
    a RAG system independently without the original question available
      (Example:
        - initial question: "What is the capital of France?"
        - bad sub-question: "What is the name of the river there?"
        - good sub-question: "What is the name of the river that flows through Paris?"
    - For each sub-question, please provide a short explanation for why it is a good sub-question. So
    generate a list of dictionaries with the following format:
      [{{"sub_question": <sub-question>, "explanation": <explanation>, "search_term": <rewrite the
      sub-question using as a search phrase for the document store>}}, ...]

    \n\n
    Here is the initial question:
    \n ------- \n
    {question}
    \n ------- \n

    Here is the initial sub-optimal answer:
    \n ------- \n
    {base_answer}
    \n ------- \n

    Here are the sub-questions that were answered:
    \n ------- \n
    {answered_sub_questions}
    \n ------- \n

    Here are the sub-questions that were suggested but not answered:
    \n ------- \n
    {failed_sub_questions}
    \n ------- \n

    And here are the entities, relationships and terms extracted from the context:
    \n ------- \n
    {entity_term_extraction_str}
    \n ------- \n

   Please generate the list of good, fully contextualized sub-questions that would help to address the
   main question. Again, please find questions that are NOT overlapping too much with the already answered
   sub-questions or those that already were suggested and failed.
   In other words - what can we try in addition to what has been tried so far?

   Please think through it step by step and then generate the list of json dictionaries with the following
   format:

   {{"sub_questions": [{{"sub_question": <sub-question>,
        "explanation": <explanation>,
        "search_term": <rewrite the sub-question using as a search phrase for the document store>}},
        ...]}} """

DEEP_DECOMPOSE_PROMPT = """ \n
    An initial user question needs to be answered. An initial answer has been provided but it wasn't quite
    good enough. Also, some sub-questions had been answered and this information has been used to provide
    the initial answer. Some other subquestions may have been suggested based on little knowledge, but they
    were not directly answerable. Also, some entities, relationships and terms are givenm to you so that
    you have an idea of how the avaiolable data looks like.

    Your role is to generate 4-6 new sub-questions that would help to answer the initial question,
    considering:

    1) The initial question
    2) The initial answer that was found to be unsatisfactory
    3) The sub-questions that were answered
    4) The sub-questions that were suggested but not answered
    5) The entities, relationships and terms that were extracted from the context

    The individual questions should be answerable by a good RAG system.
    So a good idea would be to use the sub-questions to resolve ambiguities and/or to separate the
    question for different entities that may be involved in the original question, but in a way that does
    not duplicate questions that were already tried.

    Additional Guidelines:
    - The sub-questions should be specific to the question and provide richer context for the question,
    resolve ambiguities, or address shortcoming of the initial answer
    - Each sub-question - when answered - should be relevant for the answer to the original question
    - The sub-questions should be free from comparisions, ambiguities,judgements, aggregations, or any
    other complications that may require extra context.
    - The sub-questions MUST have the full context of the original question so that it can be executed by
    a RAG system independently without the original question available
      (Example:
        - initial question: "What is the capital of France?"
        - bad sub-question: "What is the name of the river there?"
        - good sub-question: "What is the name of the river that flows through Paris?"
    - For each sub-question, please also provide a search term that can be used to retrieve relevant
    documents from a document store.
    \n\n
    Here is the initial question:
    \n ------- \n
    {question}
    \n ------- \n

    Here is the initial sub-optimal answer:
    \n ------- \n
    {base_answer}
    \n ------- \n

    Here are the sub-questions that were answered:
    \n ------- \n
    {answered_sub_questions}
    \n ------- \n

    Here are the sub-questions that were suggested but not answered:
    \n ------- \n
    {failed_sub_questions}
    \n ------- \n

    And here are the entities, relationships and terms extracted from the context:
    \n ------- \n
    {entity_term_extraction_str}
    \n ------- \n

   Please generate the list of good, fully contextualized sub-questions that would help to address the
   main question. Again, please find questions that are NOT overlapping too much with the already answered
   sub-questions or those that already were suggested and failed.
   In other words - what can we try in addition to what has been tried so far?

   Generate the list of json dictionaries with the following format:

   {{"sub_questions": [{{"sub_question": <sub-question>,
        "search_term": <rewrite the sub-question using as a search phrase for the document store>}},
        ...]}} """

DECOMPOSE_PROMPT = """ \n
    For an initial user question, please generate at 5-10 individual sub-questions whose answers would help
    \n to answer the initial question. The individual questions should be answerable by a good RAG system.
    So a good idea would be to \n use the sub-questions to resolve ambiguities and/or to separate the
    question for different entities that may be involved in the original question.

    In order to arrive at meaningful sub-questions, please also consider the context retrieved from the
    document store, expressed as entities, relationships and terms. You can also think about the types
    mentioned in brackets

    Guidelines:
    - The sub-questions should be specific to the question and provide richer context for the question,
    and or resolve ambiguities
    - Each sub-question - when answered - should be relevant for the answer to the original question
    - The sub-questions should be free from comparisions, ambiguities,judgements, aggregations, or any
    other complications that may require extra context.
    - The sub-questions MUST have the full context of the original question so that it can be executed by
    a RAG system independently without the original question available
      (Example:
        - initial question: "What is the capital of France?"
        - bad sub-question: "What is the name of the river there?"
        - good sub-question: "What is the name of the river that flows through Paris?"
    - For each sub-question, please provide a short explanation for why it is a good sub-question. So
    generate a list of dictionaries with the following format:
      [{{"sub_question": <sub-question>, "explanation": <explanation>, "search_term": <rewrite the
      sub-question using as a search phrase for the document store>}}, ...]

    \n\n
    Here is the initial question:
    \n ------- \n
    {question}
    \n ------- \n

    And here are the entities, relationships and terms extracted from the context:
    \n ------- \n
    {entity_term_extraction_str}
    \n ------- \n

   Please generate the list of good, fully contextualized sub-questions that would help to address the
   main question. Don't be too specific unless the original question is specific.
   Please think through it step by step and then generate the list of json dictionaries with the following
   format:
   {{"sub_questions": [{{"sub_question": <sub-question>,
        "explanation": <explanation>,
        "search_term": <rewrite the sub-question using as a search phrase for the document store>}},
        ...]}} """

#### Consolidations
COMBINED_CONTEXT = """-------
    Below you will find useful information to answer the original question. First, you see a number of
    sub-questions with their answers. This information should be considered to be more focussed and
    somewhat more specific to the original question as it tries to contextualized facts.
    After that will see the documents that were considered to be relevant to answer the original question.

    Here are the sub-questions and their answers:
    \n\n {deep_answer_context} \n\n
    \n\n Here are the documents that were considered to be relevant to answer the original question:
    \n\n {formated_docs} \n\n
    ----------------
    """

SUB_QUESTION_EXPLANATION_RANKER_PROMPT = """-------
    Below you will find a question that we ultimately want to answer (the original question) and a list of
    motivations in arbitrary order for generated sub-questions that are supposed to help us answering the
    original question. The motivations are formatted as <motivation number>:  <motivation explanation>.
    (Again, the numbering is arbitrary and does not necessarily mean that 1 is the most relevant
    motivation and 2 is less relevant.)

    Please rank the motivations in order of relevance for answering the original question. Also, try to
    ensure that the top questions do not duplicate too much, i.e. that they are not too similar.
    Ultimately, create a list with the motivation numbers where the number of the most relevant
    motivations comes first.

    Here is the original question:
    \n\n {original_question} \n\n
    \n\n Here is the list of sub-question motivations:
    \n\n {sub_question_explanations} \n\n
    ----------------

    Please think step by step and then generate the ranked list of motivations.

    Please format your answer as a json object in the following format:
    {{"reasonning": <explain your reasoning for the ranking>,
      "ranked_motivations": <ranked list of motivation numbers>}}
    """
