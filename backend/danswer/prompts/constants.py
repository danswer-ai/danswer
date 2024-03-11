GENERAL_SEP_PAT = "--------------"  # Same length as Langchain's separator
CODE_BLOCK_PAT = "```\n{}\n```"
TRIPLE_BACKTICK = "```"
QUESTION_PAT = "Query:"
FINAL_QUERY_PAT = "Final Query:"
THOUGHT_PAT = "Thought:"
ANSWER_PAT = "Answer:"
ANSWERABLE_PAT = "Answerable:"
FINAL_ANSWER_PAT = "Final Answer:"
UNCERTAINTY_PAT = "?"
QUOTE_PAT = "Quote:"
QUOTES_PAT_PLURAL = "Quotes:"
INVALID_PAT = "Invalid:"
SOURCES_KEY = "sources"

DEFAULT_IGNORE_STATEMENT = " Ignore any context documents that are not relevant."

REQUIRE_CITATION_STATEMENT = """
Cite relevant statements INLINE using the format [1], [2], [3], etc to reference the document number, \
DO NOT provide a reference section at the end and DO NOT provide any links following the citations.
""".rstrip()

NO_CITATION_STATEMENT = """
Do not provide any citations even if there are examples in the chat history.
""".rstrip()

CITATION_REMINDER = """
Remember to provide inline citations in the format [1], [2], [3], etc.
"""
