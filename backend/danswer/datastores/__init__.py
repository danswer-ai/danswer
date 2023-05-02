from typing import Type

from danswer.configs.app_configs import DEFAULT_VECTOR_STORE
from danswer.datastores.interfaces import Datastore
from danswer.datastores.qdrant.store import QdrantDatastore


def get_selected_datastore_cls(
    vector_db_type: str = DEFAULT_VECTOR_STORE,
) -> Type[Datastore]:
    """Returns the selected Datastore cls. Only one datastore
    should be selected for a specific deployment."""
    if vector_db_type == "qdrant":
        return QdrantDatastore
    else:
        raise ValueError(f"Invalid Vector DB setting: {vector_db_type}")


def create_datastore(
    collection: str, vector_db_type: str = DEFAULT_VECTOR_STORE
) -> Datastore:
    if vector_db_type == "qdrant":
        return QdrantDatastore(collection=collection)
    else:
        raise ValueError(f"Invalid Vector DB setting: {vector_db_type}")
