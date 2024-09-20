import re
from typing import Any

from onyx.db.models import Standaronyx as StandaronyxModel
from onyx.db.models import StandaronyxCategory as StandaronyxCategoryModel
from pydantic import BaseModel
from pydantic import field_validator
from pydantic import model_validator


class StandaronyxCategoryCreationRequest(BaseModel):
    name: str


class StandaronyxCategory(BaseModel):
    id: int
    name: str

    @classmethod
    def from_model(
        cls, standard_answer_category: StandaronyxCategoryModel
    ) -> "StandaronyxCategory":
        return cls(
            id=standard_answer_category.id,
            name=standard_answer_category.name,
        )


class Standaronyx(BaseModel):
    id: int
    keyword: str
    answer: str
    categories: list[StandaronyxCategory]
    match_regex: bool
    match_any_keywords: bool

    @classmethod
    def from_model(cls, standard_answer_model: StandaronyxModel) -> "Standaronyx":
        return cls(
            id=standard_answer_model.id,
            keyword=standard_answer_model.keyword,
            answer=standard_answer_model.answer,
            match_regex=standard_answer_model.match_regex,
            match_any_keywords=standard_answer_model.match_any_keywords,
            categories=[
                StandaronyxCategory.from_model(standard_answer_category_model)
                for standard_answer_category_model in standard_answer_model.categories
            ],
        )


class StandaronyxCreationRequest(BaseModel):
    keyword: str
    answer: str
    categories: list[int]
    match_regex: bool
    match_any_keywords: bool

    @field_validator("categories", mode="before")
    @classmethod
    def validate_categories(cls, value: list[int]) -> list[int]:
        if len(value) < 1:
            raise ValueError(
                "At least one category must be attached to a standard answer"
            )
        return value

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
