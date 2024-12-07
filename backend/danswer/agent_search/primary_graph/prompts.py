INITIAL_DECOMPOSITION_PROMPT = """ \n
    Please decompose an initial user question into not more than 4 appropriate sub-questions that help to
    answer the original question. The purpose for this decomposition is to isolate individulal entities
    (i.e., 'compare sales of company A and company B' -> 'what are sales for company A' + 'what are sales
    for company B'), split ambiguous terms (i.e., 'what is our success with company A' -> 'what are our
    sales with company A' + 'what is our market share with company A' + 'is company A a reference customer
    for us'), etc. Each sub-question should be realistically be answerable by a good RAG system. \n

    For each sub-question, please also create one search term that can be used to retrieve relevant
    documents from a document store.

    Here is the initial question:
    \n ------- \n
    {question}
    \n ------- \n

    Please formulate your answer as a list of json objects with the following format:

   [{{"sub_question": <sub-question>, "search_term": <search term>}}, ...]

    Answer:
    """

INITIAL_RAG_PROMPT = """ \n
    You are an assistant for question-answering tasks. Use the information provided below - and only the
    provided information - to answer the provided question.

    The information provided below consists of:
     1) a number of answered sub-questions - these are very important(!) and definitely should be
     considered to answer the question.
     2) a number of documents that were also deemed relevant for the question.

    If you don't know the answer or if the provided information is empty or insufficient, just say
    "I don't know". Do not use your internal knowledge!

    Again, only use the provided informationand do not use your internal knowledge! It is a matter of life
    and death that you do NOT use your internal knowledge, just the provided information!

    Try to keep your answer concise.

    And here is the question and the provided information:
    \n
    \nQuestion:\n {question}

    \nAnswered Sub-questions:\n {answered_sub_questions}

    \nContext:\n {context} \n\n
    \n\n

    Answer:"""

ENTITY_TERM_PROMPT = """ \n
    Based on the original question and the context retieved from a dataset, please generate a list of
    entities (e.g. companies, organizations, industries, products, locations, etc.), terms and concepts
    (e.g. sales, revenue, etc.) that are relevant for the question, plus their relations to each other.

    \n\n
    Here is the original question:
    \n ------- \n
    {question}
    \n ------- \n
   And here is the context retrieved:
    \n ------- \n
    {context}
    \n ------- \n

    Please format your answer as a json object in the following format:

    {{"retrieved_entities_relationships": {{
        "entities": [{{
            "entity_name": <assign a name for the entity>,
            "entity_type": <specify a short type name for the entity, such as 'company', 'location',...>
        }}],
        "relationships": [{{
            "name": <assign a name for the relationship>,
            "type": <specify a short type name for the relationship, such as 'sales_to', 'is_location_of',...>,
            "entities": [<related entity name 1>, <related entity name 2>]
        }}],
        "terms": [{{
            "term_name": <assign a name for the term>,
            "term_type": <specify a short type name for the term, such as 'revenue', 'market_share',...>,
            "similar_to": <list terms that are similar to this term>
        }}]
    }}
    }}
   """
