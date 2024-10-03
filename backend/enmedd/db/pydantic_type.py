import json
from typing import Any
from typing import Optional
from typing import Type

from pydantic import BaseModel
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import TypeDecorator


class PydanticType(TypeDecorator):
    impl = JSONB

    def __init__(
        self, pydantic_model: Type[BaseModel], *args: Any, **kwargs: Any
    ) -> None:
        super().__init__(*args, **kwargs)
        self.pydantic_model = pydantic_model

    def process_bind_param(
        self, dialect: Any, value: Optional[BaseModel] = None
    ) -> Optional[dict]:
        if value is not None:
            return json.loads(value.json())
        return None

    def process_result_value(
        self, dialect: Any, value: Optional[dict] = None
    ) -> Optional[BaseModel]:
        if value is not None:
            return self.pydantic_model.parse_obj(value)
        return None
