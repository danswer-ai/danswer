import os
import time
import uuid
from typing import cast

from retry import retry
from sqlalchemy.orm import Session

from danswer.configs.constants import DocumentSource
from danswer.configs.constants import FileOrigin
from danswer.connectors.models import InputType
from danswer.db.connector import connector_by_name_source_exists
from danswer.db.connector import create_connector
from danswer.db.connector_credential_pair import add_credential_to_connector
from danswer.db.credentials import create_credential
from danswer.db.embedding_model import get_current_db_embedding_model
from danswer.db.engine import (
    get_sqlalchemy_engine_for_port_number,
)
from danswer.db.index_attempt import create_index_attempt
from danswer.db.index_attempt import get_inprogress_index_attempts
from danswer.file_store.file_store import get_default_file_store
from danswer.server.documents.models import ConnectorBase
from danswer.server.documents.models import CredentialBase
from tests.regression.answer_quality.cli_utils import get_server_host_port


def _create_connector(file_paths: list[str], db_session: Session) -> int:
    count = 0
    name_base = "ZipConnector_"
    while connector_by_name_source_exists(
        name_base + str(count), DocumentSource.FILE, db_session
    ):
        count += 1
    name = name_base + str(count)
    connector = ConnectorBase(
        name=name,
        source=DocumentSource.FILE,
        input_type=InputType.LOAD_STATE,
        connector_specific_config={"file_locations": file_paths},
        refresh_freq=None,
        prune_freq=None,
        disabled=False,
    )
    connector_response = create_connector(connector, db_session)
    return int(connector_response.id)


def _create_credential(db_session: Session) -> int:
    empty_credential = CredentialBase(credential_json={}, admin_public=True)
    credential = create_credential(empty_credential, None, db_session)
    return credential.id


def _create_cc_pair(connector_id: int, credential_id: int, db_session: Session) -> None:
    add_credential_to_connector(
        connector_id=connector_id,
        credential_id=credential_id,
        cc_pair_name=f"Connector_{connector_id}_{credential_id}",
        is_public=True,
        user=None,
        db_session=db_session,
    )


def _run_cc_once(connector_id: int, credential_id: int, db_session: Session) -> None:
    try:
        embedding_model = get_current_db_embedding_model(db_session)
        create_index_attempt(
            connector_id=connector_id,
            credential_id=credential_id,
            embedding_model_id=embedding_model.id,
            from_beginning=True,
            db_session=db_session,
        )
    except ValueError:
        raise RuntimeError(f"Connector by id {connector_id} does not exist.")


@retry(tries=10, delay=5, backoff=2)
def _upload_file(zip_file_path: str, db_session: Session) -> list[str]:
    file_name = os.path.basename(zip_file_path)
    print("attempting to upload: ", file_name)
    file_content = open(zip_file_path, "rb")

    try:
        file_store = get_default_file_store(db_session)
        file_paths = []
        if not file_name:
            raise RuntimeError("File name cannot be empty")
        file_path = os.path.join(str(uuid.uuid4()), cast(str, file_name))
        file_paths.append(file_path)
        file_store.save_file(
            file_name=file_path,
            content=file_content,
            display_name=file_name,
            file_origin=FileOrigin.CONNECTOR,
            file_type="text/plain",
        )
        print("file_paths:", file_paths)
        return file_paths
    except ValueError as e:
        # raise RuntimeError(f"File upload failed: {str(e)}")
        print(str(e))


def upload_test_files(zip_file_path: str, run_suffix: str) -> None:
    api_port = get_server_host_port("relational_db", run_suffix, "5432")
    engine = get_sqlalchemy_engine_for_port_number(api_port)
    with Session(engine, expire_on_commit=False) as db_session:
        file_paths = _upload_file(zip_file_path, db_session)
        conn_id = _create_connector(file_paths, db_session)
        cred_id = _create_credential(db_session)

        _create_cc_pair(conn_id, cred_id, db_session)
        _run_cc_once(conn_id, cred_id, db_session)

        while True:
            in_progress_attemps = get_inprogress_index_attempts(conn_id, db_session)
            if not in_progress_attemps:
                return
            wait_seconds = 15
            print(f"still_indexing, waiting {wait_seconds} seconds")
            time.sleep(wait_seconds)


if __name__ == "__main__":
    file_location = "/Users/danswer/testdocuments/20240628_source_documents.zip"
    # file_location = "/Users/danswer/testdocuments/samplepptx.pptx"
    run_suffix = ""
    upload_test_files(file_location, run_suffix)
