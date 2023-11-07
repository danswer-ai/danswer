from datetime import datetime


def get_current_llm_day_time() -> str:
    current_datetime = datetime.now()
    # Format looks like: "October 16, 2023 14:30"
    formatted_datetime = current_datetime.strftime("%B %d, %Y %H:%M")
    day_of_week = current_datetime.strftime("%A")
    return f"The current day and time is {day_of_week} {formatted_datetime}"
