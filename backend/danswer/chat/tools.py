from danswer.direct_qa.interfaces import DanswerChatModelOut


def call_tool(
    model_actions: DanswerChatModelOut,
) -> str:
    raise NotImplementedError("There are no additional tool integrations right now")
