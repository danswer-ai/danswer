from typing import Generic
from typing import Optional
from typing import TypeVar

from pydantic.generics import GenericModel


DataT = TypeVar("DataT")


class StatusResponse(GenericModel, Generic[DataT]):
    success: bool
    message: Optional[str] = None
    data: Optional[DataT] = None
