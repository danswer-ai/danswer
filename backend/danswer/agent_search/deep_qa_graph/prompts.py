SUB_CHECK_PROMPT = """ \n
    Please check whether the suggested answer seems to address the original question.

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
