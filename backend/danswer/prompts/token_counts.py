from danswer.llm.utils import check_number_of_tokens
from danswer.prompts.chat_prompts import CHAT_USER_PROMPT
from danswer.prompts.chat_prompts import CITATION_REMINDER
from danswer.prompts.chat_prompts import DEFAULT_IGNORE_STATEMENT
from danswer.prompts.chat_prompts import REQUIRE_CITATION_STATEMENT
from danswer.prompts.direct_qa_prompts import LANGUAGE_HINT


# tokens outside of the actual persona's "user_prompt" that make up the end
# user message
CHAT_USER_PROMPT_WITH_CONTEXT_OVERHEAD_TOKEN_CNT = check_number_of_tokens(
    CHAT_USER_PROMPT.format(
        context_docs_str="",
        task_prompt="",
        user_query="",
        optional_ignore_statement=DEFAULT_IGNORE_STATEMENT,
    )
)

CITATION_STATEMENT_TOKEN_CNT = check_number_of_tokens(REQUIRE_CITATION_STATEMENT)

CITATION_REMINDER_TOKEN_CNT = check_number_of_tokens(CITATION_REMINDER)

LANGUAGE_HINT_TOKEN_CNT = check_number_of_tokens(LANGUAGE_HINT)
