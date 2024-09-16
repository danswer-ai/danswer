import re
from typing import Any

from pydantic import BaseModel
from pydantic import model_validator

from danswer.db.models import StandardAnswer as StandardAnswerModel


class StandardAnswer(BaseModel):
    id: int
    keyword: str
    answer: str
    match_regex: bool
    match_any_keywords: bool

    @classmethod
    def from_model(cls, standard_answer_model: StandardAnswerModel) -> "StandardAnswer":
        return cls(
            id=standard_answer_model.id,
            keyword=standard_answer_model.keyword,
            answer=standard_answer_model.answer,
            match_regex=standard_answer_model.match_regex,
            match_any_keywords=standard_answer_model.match_any_keywords,
        )


class StandardAnswerCreationRequest(BaseModel):
    keyword: str
    answer: str
    match_regex: bool
    match_any_keywords: bool

    @model_validator(mode="after")
    def validate_only_match_any_if_not_regex(self) -> Any:
        if self.match_regex and self.match_any_keywords:
            raise ValueError(
                "Can only match any keywords in keyword mode, not regex mode"
            )

        return self

    @model_validator(mode="after")
    def validate_keyword_if_regex(self) -> Any:
        if not self.match_regex:
            # no validation for keywords
            return self

        try:
            re.compile(self.keyword)
            return self
        except re.error as err:
            if isinstance(err.pattern, bytes):
                raise ValueError(
                    f'invalid regex pattern r"{err.pattern.decode()}" in `keyword`: {err.msg}'
                )
            else:
                pattern = f'r"{err.pattern}"' if err.pattern is not None else ""
                raise ValueError(
                    " ".join(
                        ["invalid regex pattern", pattern, f"in `keyword`: {err.msg}"]
                    )
                )
