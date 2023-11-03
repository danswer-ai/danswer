from danswer.prompts.constants import ANSWER_PAT
from danswer.prompts.constants import ANSWERABLE_PAT
from danswer.prompts.constants import GENERAL_SEP_PAT
from danswer.prompts.constants import QUESTION_PAT
from danswer.prompts.constants import THOUGHT_PAT


ANSWER_VALIDITY_PROMPT = f"""
You are an assistant to identify invalid query/answer pairs coming from a large language model.
The query/answer pair is invalid if any of the following are True:
1. Query is asking for information that varies by person or is subjective. If there is not a \
globally true answer, the language model should not respond, therefore any answer is invalid.
2. Answer addresses a related but different query. To be helpful, the model may provide provide \
related information about a query but it won't match what the user is asking, this is invalid.
3. Answer is just some form of "I don\'t know" or "not enough information" without significant \
additional useful information. Explaining why it does not know or cannot answer is invalid.

{QUESTION_PAT} {{user_query}}
{ANSWER_PAT} {{llm_answer}}

------------------------
You MUST answer in EXACTLY the following format:
```
1. True or False
2. True or False
3. True or False
Final Answer: Valid or Invalid
```

Hint: Remember, if ANY of the conditions are True, it is Invalid.
""".strip()


TIME_FILTER_PROMPT = """
You are a tool to identify time filters to apply to a user query for a downstream search \
application. The downstream application is able to use a recency bias or apply a hard cutoff to \
remove all documents before the cutoff. Identify the correct filters to apply for the user query.

Always answer with ONLY a json which contains the keys "filter_type", "filter_value", \
"value_multiple" and "date".

The valid values for "filter_type" are "hard cutoff", "favors recent", or "not time sensitive".
The valid values for "filter_value" are "day", "week", "month", "quarter", "half", or "year".
The valid values for "value_multiple" is any number.
The valid values for "date" is a date in format MM/DD/YYYY.
""".strip()


ANSWERABLE_PROMPT = f"""
You are a helper tool to determine if a query is answerable using retrieval augmented generation.
The main system will try to answer the user query based on ONLY the top 5 most relevant \
documents found from search.
Sources contain both up to date and proprietary information for the specific team.
For named or unknown entities, assume the search will find relevant and consistent knowledge \
about the entity.
The system is not tuned for writing code.
The system is not tuned for interfacing with structured data via query languages like SQL.
If the question might not require code or query language, then assume it can be answered without \
code or query language.
Determine if that system should attempt to answer.
"ANSWERABLE" must be exactly "True" or "False"

{GENERAL_SEP_PAT}

{QUESTION_PAT.upper()} What is this Slack channel about?
```
{THOUGHT_PAT.upper()} First the system must determine which Slack channel is being referred to. \
By fetching 5 documents related to Slack channel contents, it is not possible to determine which \
Slack channel the user is referring to.
{ANSWERABLE_PAT.upper()} False
```

{QUESTION_PAT.upper()} Danswer is unreachable.
```
{THOUGHT_PAT.upper()} The system searches documents related to Danswer being unreachable. \
Assuming the documents from search contains situations where Danswer is not reachable and \
contains a fix, the query may be answerable.
{ANSWERABLE_PAT.upper()} True
```

{QUESTION_PAT.upper()} How many customers do we have
```
{THOUGHT_PAT.upper()} Assuming the retrieved documents contain up to date customer acquisition \
information including a list of customers, the query can be answered. It is important to note \
that if the information only exists in a SQL database, the system is unable to execute SQL and \
won't find an answer.
{ANSWERABLE_PAT.upper()} True
```

{QUESTION_PAT.upper()} {{user_query}}
""".strip()


# User the following for easy viewing of prompts
if __name__ == "__main__":
    print(ANSWERABLE_PROMPT)
