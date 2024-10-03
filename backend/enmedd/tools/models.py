from typing import Any
from typing import Dict
from typing import List
from typing import Optional
from typing import Union

from pydantic import BaseModel
from pydantic import model_validator


class ToolResponse(BaseModel):
    id: str | None = None
    response: Any


class ToolCallKickoff(BaseModel):
    tool_name: str
    tool_args: dict[str, Any]


class ToolRunnerResponse(BaseModel):
    tool_run_kickoff: Optional[ToolCallKickoff] = None
    tool_response: Optional[ToolResponse] = None
    tool_message_content: Optional[Union[str, List[Union[str, Dict[str, Any]]]]] = None

    @model_validator(mode="before")
    def validate_tool_runner_response(
        cls, values: Dict[str, Union[ToolResponse, str]]
    ) -> Dict[str, Union[ToolResponse, str]]:
        fields = ["tool_response", "tool_message_content", "tool_run_kickoff"]
        provided = sum(1 for field in fields if values.get(field) is not None)

        if provided != 1:
            raise ValueError(
                "Exactly one of 'tool_response', 'tool_message_content', "
                "or 'tool_run_kickoff' must be provided"
            )

        return values


class ToolCallFinalResult(ToolCallKickoff):
    tool_result: Any  # we would like to use JSON_ro, but can't due to its recursive nature
