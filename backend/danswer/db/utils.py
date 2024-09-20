from typing import Any

from onyx.db.models import Base
from sqlalchemy import inspect


def model_to_dict(model: Base) -> dict[str, Any]:
    return {c.key: getattr(model, c.key) for c in inspect(model).mapper.column_attrs}  # type: ignore
