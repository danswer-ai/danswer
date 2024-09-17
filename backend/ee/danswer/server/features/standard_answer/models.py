import re
from typing import Any

from pydantic import BaseModel
from pydantic import model_validator

from danswer.db.models import StandardAnswer as DbStandardAnswer
from danswer.server.features.persona.models import PersonaSnapshot


class StandardAnswer(BaseModel):
    id: int
    keyword: str
    answer: str
    match_regex: bool
    match_any_keywords: bool
    apply_globally: bool
    personas: list[PersonaSnapshot] | None

    @classmethod
    def from_model(cls, standard_answer_model: DbStandardAnswer) -> "StandardAnswer":
        return cls(
            id=standard_answer_model.id,
            keyword=standard_answer_model.keyword,
            answer=standard_answer_model.answer,
            match_regex=standard_answer_model.match_regex,
            match_any_keywords=standard_answer_model.match_any_keywords,
            apply_globally=standard_answer_model.apply_globally,
            personas=[
                PersonaSnapshot.from_model(persona)
                for persona in standard_answer_model.personas
            ],
        )


class StandardAnswerCreationRequest(BaseModel):
    keyword: str
    answer: str
    match_regex: bool
    match_any_keywords: bool
    apply_globally: bool
    persona_ids: list[int]

    @model_validator(mode="after")
    def validate_personas(self) -> Any:
        personas_specified = len(self.persona_ids) > 0

        if personas_specified and self.apply_globally:
            raise ValueError(
                "A standard answer can watch for all messages or for messages on one or more assistants, not both"
            )

        if not self.apply_globally and not personas_specified:
            raise ValueError(
                "No message watchers specified: choose at least one assistant or turn on watching for all messages"
            )

        return self

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
