import json

from danswer.prompts.constants import ANSWER_PAT
from danswer.prompts.constants import GENERAL_SEP_PAT
from danswer.prompts.constants import QUESTION_PAT
from danswer.prompts.constants import QUOTE_PAT
from danswer.prompts.constants import THOUGHT_PAT
from danswer.prompts.constants import UNCERTAINTY_PAT


QA_HEADER = """
You are a question answering system that is constantly learning and improving.
You can process and comprehend vast amounts of text and utilize this knowledge to provide \
accurate and detailed answers to diverse queries.
""".strip()


REQUIRE_JSON = """
You ALWAYS responds with only a json containing an answer and quotes that support the answer.
Your responses are as INFORMATIVE and DETAILED as possible.
""".strip()


JSON_HELPFUL_HINT = """
Hint: Make the answer as DETAILED as possible and respond in JSON format! \
Quotes MUST be EXACT substrings from provided documents!
""".strip()


LANGUAGE_HINT = """
IMPORTANT: Respond in the same language as my query!
""".strip()


# This has to be doubly escaped due to json containing { } which are also used for format strings
EMPTY_SAMPLE_JSON = {
    "answer": "Place your final answer here. It should be as DETAILED and INFORMATIVE as possible.",
    "quotes": [
        "each quote must be UNEDITED and EXACTLY as shown in the context documents!",
        "HINT, quotes are not shown to the user!",
    ],
}


ANSWER_NOT_FOUND_RESPONSE = f'{{"answer": "{UNCERTAINTY_PAT}", "quotes": []}}'


# Default json prompt which can reference multiple docs and provide answer + quotes
JSON_PROMPT = f"""
{QA_HEADER}
{REQUIRE_JSON}

CONTEXT:
{GENERAL_SEP_PAT}
{{context_docs_str}}
{GENERAL_SEP_PAT}

SAMPLE_RESPONSE:
```
{{{json.dumps(EMPTY_SAMPLE_JSON)}}}
```
{QUESTION_PAT.upper()} {{user_query}}
{JSON_HELPFUL_HINT}
{{language_hint_or_none}}
""".strip()


# Default chain-of-thought style json prompt which uses multiple docs
# This one has a section for the LLM to output some non-answer "thoughts"
# COT (chain-of-thought) flow basically
COT_PROMPT = f"""
{QA_HEADER}

CONTEXT:
{GENERAL_SEP_PAT}
{{context_docs_str}}
{GENERAL_SEP_PAT}

You MUST respond in the following format:
```
{THOUGHT_PAT} Use this section as a scratchpad to reason through the answer.

{{{json.dumps(EMPTY_SAMPLE_JSON)}}}
```

{QUESTION_PAT.upper()} {{user_query}}
{JSON_HELPFUL_HINT}
{{language_hint_or_none}}
""".strip()


# For weak LLM which only takes one chunk and cannot output json
WEAK_LLM_PROMPT = f"""
Respond to the user query using a reference document.
{GENERAL_SEP_PAT}
Reference Document:
{{single_reference_doc}}
{GENERAL_SEP_PAT}
Answer the user query below based on the reference document above.
Respond with an "{ANSWER_PAT}" section and as many "{QUOTE_PAT}" sections as needed to support \
the answer.'

{QUESTION_PAT.upper()} {{user_query}}
{ANSWER_PAT.upper()}
""".strip()


# For weak CHAT LLM which takes one chunk and cannot output json
# The next message should have the user query
# Note, no flow/config currently uses this one
WEAK_CHAT_LLM_PROMPT = f"""
You are a question answering assistant
Respond to the user query with an "{ANSWER_PAT}" section and \
as many "{QUOTE_PAT}" sections as needed to support the answer.
Answer the user query based on the following document:

{{first_chunk_content}}
""".strip()


# Paramaterized prompt which allows the user to specify their
# own system / task prompt
PARAMATERIZED_PROMPT = f"""
{{system_prompt}}

CONTEXT:
{GENERAL_SEP_PAT}
{{context_docs_str}}
{GENERAL_SEP_PAT}

{{task_prompt}}

{QUESTION_PAT.upper()} {{user_query}}
RESPONSE:
""".strip()


# User the following for easy viewing of prompts
if __name__ == "__main__":
    print(JSON_PROMPT)  # Default prompt used in the Danswer UI flow
