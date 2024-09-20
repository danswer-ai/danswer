import os

#####
# onyx Slack Bot Configs
#####
onyx_BOT_NUM_RETRIES = int(os.environ.get("onyx_BOT_NUM_RETRIES", "5"))
onyx_BOT_ANSWER_GENERATION_TIMEOUT = int(
    os.environ.get("onyx_BOT_ANSWER_GENERATION_TIMEOUT", "90")
)
# How much of the available input context can be used for thread context
onyx_BOT_TARGET_CHUNK_PERCENTAGE = 512 * 2 / 3072
# Number of docs to display in "Reference Documents"
onyx_BOT_NUM_DOCS_TO_DISPLAY = int(os.environ.get("onyx_BOT_NUM_DOCS_TO_DISPLAY", "5"))
# If the LLM fails to answer, onyx can still show the "Reference Documents"
onyx_BOT_DISABLE_DOCS_ONLY_ANSWER = os.environ.get(
    "onyx_BOT_DISABLE_DOCS_ONLY_ANSWER", ""
).lower() not in ["false", ""]
# When onyx is considering a message, what emoji does it react with
onyx_REACT_EMOJI = os.environ.get("onyx_REACT_EMOJI") or "eyes"
# When User needs more help, what should the emoji be
onyx_FOLLOWUP_EMOJI = os.environ.get("onyx_FOLLOWUP_EMOJI") or "sos"
# What kind of message should be shown when someone gives an AI answer feedback to onyxBot
# Defaults to Private if not provided or invalid
# Private: Only visible to user clicking the feedback
# Anonymous: Public but anonymous
# Public: Visible with the user name who submitted the feedback
onyx_BOT_FEEDBACK_VISIBILITY = (
    os.environ.get("onyx_BOT_FEEDBACK_VISIBILITY") or "private"
)
# Should onyxBot send an apology message if it's not able to find an answer
# That way the user isn't confused as to why onyxBot reacted but then said nothing
# Off by default to be less intrusive (don't want to give a notif that just says we couldnt help)
NOTIFY_SLACKBOT_NO_ANSWER = (
    os.environ.get("NOTIFY_SLACKBOT_NO_ANSWER", "").lower() == "true"
)
# Mostly for debugging purposes but it's for explaining what went wrong
# if onyxBot couldn't find an answer
onyx_BOT_DISPLAY_ERROR_MSGS = os.environ.get(
    "onyx_BOT_DISPLAY_ERROR_MSGS", ""
).lower() not in [
    "false",
    "",
]
# Default is only respond in channels that are included by a slack config set in the UI
onyx_BOT_RESPOND_EVERY_CHANNEL = (
    os.environ.get("onyx_BOT_RESPOND_EVERY_CHANNEL", "").lower() == "true"
)
# Add a second LLM call post Answer to verify if the Answer is valid
# Throws out answers that don't directly or fully answer the user query
# This is the default for all onyxBot channels unless the channel is configured individually
# Set/unset by "Hide Non Answers"
ENABLE_onyxBOT_REFLEXION = (
    os.environ.get("ENABLE_onyxBOT_REFLEXION", "").lower() == "true"
)
# Currently not support chain of thought, probably will add back later
onyx_BOT_DISABLE_COT = True
# if set, will default onyxBot to use quotes and reference documents
onyx_BOT_USE_QUOTES = os.environ.get("onyx_BOT_USE_QUOTES", "").lower() == "true"

# Maximum Questions Per Minute, Default Uncapped
onyx_BOT_MAX_QPM = int(os.environ.get("onyx_BOT_MAX_QPM") or 0) or None
# Maximum time to wait when a question is queued
onyx_BOT_MAX_WAIT_TIME = int(os.environ.get("onyx_BOT_MAX_WAIT_TIME") or 180)

# Time (in minutes) after which a Slack message is sent to the user to remind him to give feedback.
# Set to 0 to disable it (default)
onyx_BOT_FEEDBACK_REMINDER = int(os.environ.get("onyx_BOT_FEEDBACK_REMINDER") or 0)
# Set to True to rephrase the Slack users messages
onyx_BOT_REPHRASE_MESSAGE = (
    os.environ.get("onyx_BOT_REPHRASE_MESSAGE", "").lower() == "true"
)

# onyx_BOT_RESPONSE_LIMIT_PER_TIME_PERIOD is the number of
# responses onyxBot can send in a given time period.
# Set to 0 to disable the limit.
onyx_BOT_RESPONSE_LIMIT_PER_TIME_PERIOD = int(
    os.environ.get("onyx_BOT_RESPONSE_LIMIT_PER_TIME_PERIOD", "5000")
)
# onyx_BOT_RESPONSE_LIMIT_TIME_PERIOD_SECONDS is the number
# of seconds until the response limit is reset.
onyx_BOT_RESPONSE_LIMIT_TIME_PERIOD_SECONDS = int(
    os.environ.get("onyx_BOT_RESPONSE_LIMIT_TIME_PERIOD_SECONDS", "86400")
)
