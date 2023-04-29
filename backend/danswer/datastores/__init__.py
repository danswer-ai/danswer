from typing import Type

from danswer.datastores.interfaces import Datastore
from danswer.datastores.qdrant.store import QdrantDatastore


def get_selected_datastore_cls() -> Type[Datastore]:
    """Returns the selected Datastore cls. Only one datastore
    should be selected for a specific deployment."""
    # TOOD: when more datastores are added, look at env variable to
    # figure out which one should be returned
    return QdrantDatastore
