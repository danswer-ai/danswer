from types import SimpleNamespace
from typing import Any


class JsonObject(SimpleNamespace):
    type: str = 'generic'

    def __getitem__(self, name: str) -> Any:
        return super().__getattribute__(name)
    
    def get(self, name: str, default: Any = None) -> Any:
        return getattr(self, name, default)
    
    def __repr__(self) -> str:
        return f"<{self.type}> {super().__repr__()}"
    
    def __hash__(self) -> int:
        return hash(self.id)  # type: ignore

