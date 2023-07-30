from typing import Any

from qdrant_client.http.models import Record


def get_payload_from_record(record: Record, is_required: bool = True) -> dict[str, Any]:
    if record.payload is None and is_required:
        raise RuntimeError(
            "Qdrant Index is corrupted, Document found with no metadata."
        )

    return record.payload or {}
