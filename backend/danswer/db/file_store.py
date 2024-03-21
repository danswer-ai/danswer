from abc import ABC
from abc import abstractmethod
from typing import IO

from sqlalchemy.orm import Session

from danswer.db.pg_file_store import create_populate_lobj
from danswer.db.pg_file_store import delete_lobj_by_id
from danswer.db.pg_file_store import delete_pgfilestore_by_file_name
from danswer.db.pg_file_store import get_pgfilestore_by_file_name
from danswer.db.pg_file_store import read_lobj
from danswer.db.pg_file_store import upsert_pgfilestore


class FileStore(ABC):
    """
    An abstraction for storing files and large binary objects. Currently needed for:
    - File Connector communication between API Server and Indexing Job (Background Container)
    """

    @abstractmethod
    def save_file(self, file_name: str, content: IO) -> None:
        """
        Save a file along with the associated connector (CC-Pair) name.

        Parameters:
        - connector_name: Name of the CC-Pair (as specified by the user in the UI)
        - file_name: Name of the file to save
        - content: Contents of the file
        """
        raise NotImplementedError

    @abstractmethod
    def read_file(self, file_name: str, mode: str | None) -> IO:
        """
        Get the content and metadata of a file by its name. Makes assumption that if a file has a
        duplicate name to a file from another connector then the file should be updated
        (is duplicate). Also returns the metadata options extracted from the file header if exists

        Parameters:
        - file_name: Name of file to read

        Returns:
            Contents of the file and metadata dict
        """

    @abstractmethod
    def delete_file(self, file_name: str) -> None:
        """
        Delete a file by its name.

        Parameters:
        - file_name: Name of file to delete
        """


class PostgresBackedFileStore(FileStore):
    def __init__(self, db_session: Session):
        self.db_session = db_session

    def save_file(self, file_name: str, content: IO) -> None:
        try:
            # The large objects in postgres are saved as special objects can can be listed with
            # SELECT * FROM pg_largeobject_metadata;
            obj_id = create_populate_lobj(content=content, db_session=self.db_session)
            upsert_pgfilestore(
                file_name=file_name, lobj_oid=obj_id, db_session=self.db_session
            )
        except Exception:
            self.db_session.rollback()
            raise

    def read_file(self, file_name: str, mode: str | None = None) -> IO:
        try:
            file_record = get_pgfilestore_by_file_name(
                file_name=file_name, db_session=self.db_session
            )
            return read_lobj(
                lobj_oid=file_record.lobj_oid, db_session=self.db_session, mode=mode
            )
        except Exception:
            self.db_session.rollback()
            raise

    def delete_file(self, file_name: str) -> None:
        try:
            file_record = get_pgfilestore_by_file_name(
                file_name=file_name, db_session=self.db_session
            )
            delete_lobj_by_id(file_record.lobj_oid, db_session=self.db_session)
            delete_pgfilestore_by_file_name(
                file_name=file_name, db_session=self.db_session
            )
        except Exception:
            self.db_session.rollback()
            raise
