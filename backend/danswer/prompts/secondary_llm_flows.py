from danswer.prompts.constants import ANSWER_PAT
from danswer.prompts.constants import ANSWERABLE_PAT
from danswer.prompts.constants import GENERAL_SEP_PAT
from danswer.prompts.constants import QUESTION_PAT
from danswer.prompts.constants import SOURCES_KEY
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


# Smaller followup prompts in time_filter.py
TIME_FILTER_PROMPT = """
You are a tool to identify time filters to apply to a user query for a downstream search \
application. The downstream application is able to use a recency bias or apply a hard cutoff to \
remove all documents before the cutoff. Identify the correct filters to apply for the user query.

The current day and time is {current_day_time_str}.

Always answer with ONLY a json which contains the keys "filter_type", "filter_value", \
"value_multiple" and "date".

The valid values for "filter_type" are "hard cutoff", "favors recent", or "not time sensitive".
The valid values for "filter_value" are "day", "week", "month", "quarter", "half", or "year".
The valid values for "value_multiple" is any number.
The valid values for "date" is a date in format MM/DD/YYYY, ALWAYS follow this format.
""".strip()


# Smaller followup prompts in source_filter.py
# Known issue: LLMs like GPT-3.5 try to generalize. If the valid sources contains "web" but not
# "confluence" and the user asks for confluence related things, the LLM will select "web" since
# confluence is accessed as a website. This cannot be fixed without also reducing the capability
# to match things like repository->github, website->web, etc.
# This is generally not a big issue though as if the company has confluence, hopefully they add
# a connector for it or the user is aware that confluence has not been added.
SOURCE_FILTER_PROMPT = f"""
Given a user query, extract relevant source filters for use in a downstream search tool.
Respond with a json containing the source filters or null if no specific sources are referenced.
ONLY extract sources when the user is explicitly limiting the scope of where information is \
coming from.
The user may provide invalid source filters, ignore those.

The valid sources are:
{{valid_sources}}
{{web_source_warning}}
{{file_source_warning}}


ALWAYS answer with ONLY a json with the key "{SOURCES_KEY}". \
The value for "{SOURCES_KEY}" must be null or a list of valid sources.

Sample Response:
{{sample_response}}
""".strip()

WEB_SOURCE_WARNING = """
Note: The "web" source only applies to when the user specifies "website" in the query. \
It does not apply to tools such as Confluence, GitHub, etc. which have a website.
""".strip()

FILE_SOURCE_WARNING = """
Note: The "file" source only applies to when the user refers to uploaded files in the query.
""".strip()


USEFUL_PAT = "Yes useful"
NONUSEFUL_PAT = "Not useful"
CHUNK_FILTER_PROMPT = f"""
Determine if the reference section is USEFUL for answering the user query.
It is NOT enough for the section to be related to the query, \
it must contain information that is USEFUL for answering the query.
If the section contains ANY useful information, that is good enough, \
it does not need to fully answer the every part of the user query.

Reference Section:
```
{{chunk_text}}
```

User Query:
```
{{user_query}}
```

Respond with EXACTLY AND ONLY: "{USEFUL_PAT}" or "{NONUSEFUL_PAT}"
""".strip()


LANGUAGE_REPHRASE_PROMPT = """
Rephrase the query in {target_language}.
If the query is already in the correct language, \
simply repeat the ORIGINAL query back to me, EXACTLY as is with no rephrasing.
NEVER change proper nouns, technical terms, acronyms, or terms you are not familiar with.
IMPORTANT, if the query is already in the target language, DO NOT REPHRASE OR EDIT the query!

Query:
{query}
""".strip()


# User the following for easy viewing of prompts
if __name__ == "__main__":
    print(ANSWERABLE_PROMPT)
