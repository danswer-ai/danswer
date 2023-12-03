# Prompts that aren't part of a particular configurable feature

LANGUAGE_REPHRASE_PROMPT = """
Rephrase the query in {target_language}.
If the query is already in the correct language, \
simply repeat the ORIGINAL query back to me, EXACTLY as is with no rephrasing.
NEVER change proper nouns, technical terms, acronyms, or terms you are not familiar with.
IMPORTANT, if the query is already in the target language, DO NOT REPHRASE OR EDIT the query!

Query:
{query}
""".strip()


# Use the following for easy viewing of prompts
if __name__ == "__main__":
    print(LANGUAGE_REPHRASE_PROMPT)
