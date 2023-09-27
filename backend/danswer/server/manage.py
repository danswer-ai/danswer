from datetime import datetime
from datetime import timedelta
from typing import cast

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Request
from fastapi import Response
from fastapi import UploadFile
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from danswer.auth.users import current_admin_user
from danswer.auth.users import current_user
from danswer.background.celery.celery import cleanup_connector_credential_pair_task
from danswer.background.celery.deletion_utils import get_deletion_status
from danswer.background.connector_deletion import (
    get_cleanup_task_id,
)
from danswer.configs.app_configs import DISABLE_GENERATIVE_AI
from danswer.configs.app_configs import GENERATIVE_MODEL_ACCESS_CHECK_FREQ
from danswer.configs.constants import GEN_AI_API_KEY_STORAGE_KEY
from danswer.connectors.file.utils import write_temp_files
from danswer.connectors.google_drive.connector_auth import build_service_account_creds
from danswer.connectors.google_drive.connector_auth import DB_CREDENTIALS_DICT_TOKEN_KEY
from danswer.connectors.google_drive.connector_auth import delete_google_app_cred
from danswer.connectors.google_drive.connector_auth import delete_service_account_key
from danswer.connectors.google_drive.connector_auth import get_auth_url
from danswer.connectors.google_drive.connector_auth import get_google_app_cred
from danswer.connectors.google_drive.connector_auth import (
    get_google_drive_creds_for_authorized_user,
)
from danswer.connectors.google_drive.connector_auth import get_service_account_key
from danswer.connectors.google_drive.connector_auth import (
    update_credential_access_tokens,
)
from danswer.connectors.google_drive.connector_auth import upsert_google_app_cred
from danswer.connectors.google_drive.connector_auth import upsert_service_account_key
from danswer.connectors.google_drive.connector_auth import verify_csrf
from danswer.db.connector import create_connector
from danswer.db.connector import delete_connector
from danswer.db.connector import fetch_connector_by_id
from danswer.db.connector import fetch_connectors
from danswer.db.connector import get_connector_credential_ids
from danswer.db.connector import update_connector
from danswer.db.connector_credential_pair import add_credential_to_connector
from danswer.db.connector_credential_pair import get_connector_credential_pair
from danswer.db.connector_credential_pair import get_connector_credential_pairs
from danswer.db.connector_credential_pair import remove_credential_from_connector
from danswer.db.credentials import create_credential
from danswer.db.credentials import delete_google_drive_service_account_credentials
from danswer.db.credentials import fetch_credential_by_id
from danswer.db.deletion_attempt import check_deletion_attempt_is_allowed
from danswer.db.engine import get_session
from danswer.db.feedback import fetch_docs_ranked_by_boost
from danswer.db.feedback import update_document_boost
from danswer.db.index_attempt import create_index_attempt
from danswer.db.index_attempt import get_latest_index_attempts
from danswer.db.models import User
from danswer.direct_qa.llm_utils import check_model_api_key_is_valid
from danswer.direct_qa.llm_utils import get_default_qa_model
from danswer.direct_qa.open_ai import get_gen_ai_api_key
from danswer.dynamic_configs import get_dynamic_config_store
from danswer.dynamic_configs.interface import ConfigNotFoundError
from danswer.server.models import ApiKey
from danswer.server.models import AuthStatus
from danswer.server.models import AuthUrl
from danswer.server.models import BoostDoc
from danswer.server.models import BoostUpdateRequest
from danswer.server.models import ConnectorBase
from danswer.server.models import ConnectorCredentialPairIdentifier
from danswer.server.models import ConnectorCredentialPairMetadata
from danswer.server.models import ConnectorIndexingStatus
from danswer.server.models import ConnectorSnapshot
from danswer.server.models import CredentialSnapshot
from danswer.server.models import FileUploadResponse
from danswer.server.models import GDriveCallback
from danswer.server.models import GoogleAppCredentials
from danswer.server.models import GoogleServiceAccountCredentialRequest
from danswer.server.models import GoogleServiceAccountKey
from danswer.server.models import IndexAttemptSnapshot
from danswer.server.models import ObjectCreationIdResponse
from danswer.server.models import RunConnectorRequest
from danswer.server.models import StatusResponse
from danswer.server.models import UserRoleResponse
from danswer.utils.logger import setup_logger

router = APIRouter(prefix="/manage")
logger = setup_logger()

_GOOGLE_DRIVE_CREDENTIAL_ID_COOKIE_NAME = "google_drive_credential_id"


"""Admin only API endpoints"""


@router.get("/admin/doc-boosts")
def get_most_boosted_docs(
    ascending: bool,
    limit: int,
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> list[BoostDoc]:
    boost_docs = fetch_docs_ranked_by_boost(
        ascending=ascending, limit=limit, db_session=db_session
    )
    return [
        BoostDoc(
            document_id=doc.id,
            semantic_id=doc.semantic_id,
            # source=doc.source,
            link=doc.link or "",
            boost=doc.boost,
            hidden=doc.hidden,
        )
        for doc in boost_docs
    ]


@router.post("/admin/doc-boosts")
def document_boost_update(
    boost_update: BoostUpdateRequest,
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    try:
        update_document_boost(
            db_session=db_session,
            document_id=boost_update.document_id,
            boost=boost_update.boost,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/admin/connector/google-drive/app-credential")
def check_google_app_credentials_exist(
    _: User = Depends(current_admin_user),
) -> dict[str, str]:
    try:
        return {"client_id": get_google_app_cred().web.client_id}
    except ConfigNotFoundError:
        raise HTTPException(status_code=404, detail="Google App Credentials not found")


@router.put("/admin/connector/google-drive/app-credential")
def upsert_google_app_credentials(
    app_credentials: GoogleAppCredentials, _: User = Depends(current_admin_user)
) -> StatusResponse:
    try:
        upsert_google_app_cred(app_credentials)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return StatusResponse(
        success=True, message="Successfully saved Google App Credentials"
    )


@router.delete("/admin/connector/google-drive/app-credential")
def delete_google_app_credentials(
    _: User = Depends(current_admin_user),
) -> StatusResponse:
    try:
        delete_google_app_cred()
    except ConfigNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return StatusResponse(
        success=True, message="Successfully deleted Google App Credentials"
    )


@router.get("/admin/connector/google-drive/service-account-key")
def check_google_service_account_key_exist(
    _: User = Depends(current_admin_user),
) -> dict[str, str]:
    try:
        return {"service_account_email": get_service_account_key().client_email}
    except ConfigNotFoundError:
        raise HTTPException(
            status_code=404, detail="Google Service Account Key not found"
        )


@router.put("/admin/connector/google-drive/service-account-key")
def upsert_google_service_account_key(
    service_account_key: GoogleServiceAccountKey, _: User = Depends(current_admin_user)
) -> StatusResponse:
    try:
        upsert_service_account_key(service_account_key)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return StatusResponse(
        success=True, message="Successfully saved Google Service Account Key"
    )


@router.delete("/admin/connector/google-drive/service-account-key")
def delete_google_service_account_key(
    _: User = Depends(current_admin_user),
) -> StatusResponse:
    try:
        delete_service_account_key()
    except ConfigNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return StatusResponse(
        success=True, message="Successfully deleted Google Service Account Key"
    )


@router.put("/admin/connector/google-drive/service-account-credential")
def upsert_service_account_credential(
    service_account_credential_request: GoogleServiceAccountCredentialRequest,
    user: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> ObjectCreationIdResponse:
    """Special API which allows the creation of a credential for a service account.
    Combines the input with the saved service account key to create an entry in the
    `Credential` table."""
    try:
        credential_base = build_service_account_creds(
            delegated_user_email=service_account_credential_request.google_drive_delegated_user
        )
        print(credential_base)
    except ConfigNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # first delete all existing service account credentials
    delete_google_drive_service_account_credentials(user, db_session)
    return create_credential(
        credential_data=credential_base, user=user, db_session=db_session
    )


@router.get("/admin/connector/google-drive/check-auth/{credential_id}")
def check_drive_tokens(
    credential_id: int,
    user: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> AuthStatus:
    db_credentials = fetch_credential_by_id(credential_id, user, db_session)
    if (
        not db_credentials
        or DB_CREDENTIALS_DICT_TOKEN_KEY not in db_credentials.credential_json
    ):
        return AuthStatus(authenticated=False)
    token_json_str = str(db_credentials.credential_json[DB_CREDENTIALS_DICT_TOKEN_KEY])
    google_drive_creds = get_google_drive_creds_for_authorized_user(
        token_json_str=token_json_str
    )
    if google_drive_creds is None:
        return AuthStatus(authenticated=False)
    return AuthStatus(authenticated=True)


@router.get("/admin/connector/google-drive/authorize/{credential_id}")
def admin_google_drive_auth(
    response: Response, credential_id: str, _: User = Depends(current_admin_user)
) -> AuthUrl:
    # set a cookie that we can read in the callback (used for `verify_csrf`)
    response.set_cookie(
        key=_GOOGLE_DRIVE_CREDENTIAL_ID_COOKIE_NAME,
        value=credential_id,
        httponly=True,
        max_age=600,
    )
    return AuthUrl(auth_url=get_auth_url(credential_id=int(credential_id)))


@router.post("/admin/connector/file/upload")
def upload_files(
    files: list[UploadFile], _: User = Depends(current_admin_user)
) -> FileUploadResponse:
    for file in files:
        if not file.filename:
            raise HTTPException(status_code=400, detail="File name cannot be empty")
    try:
        file_paths = write_temp_files(
            [(cast(str, file.filename), file.file) for file in files]
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return FileUploadResponse(file_paths=file_paths)


@router.get("/admin/connector/indexing-status")
def get_connector_indexing_status(
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> list[ConnectorIndexingStatus]:
    indexing_statuses: list[ConnectorIndexingStatus] = []

    # TODO: make this one query
    cc_pairs = get_connector_credential_pairs(db_session)
    latest_index_attempts = get_latest_index_attempts(
        db_session=db_session,
        connector_credential_pair_identifiers=[
            ConnectorCredentialPairIdentifier(
                connector_id=cc_pair.connector_id, credential_id=cc_pair.credential_id
            )
            for cc_pair in cc_pairs
        ],
    )
    cc_pair_to_latest_index_attempt = {
        (index_attempt.connector_id, index_attempt.credential_id): index_attempt
        for index_attempt in latest_index_attempts
    }

    for cc_pair in cc_pairs:
        connector = cc_pair.connector
        credential = cc_pair.credential
        latest_index_attempt = cc_pair_to_latest_index_attempt.get(
            (connector.id, credential.id)
        )
        indexing_statuses.append(
            ConnectorIndexingStatus(
                cc_pair_id=cc_pair.id,
                name=cc_pair.name,
                connector=ConnectorSnapshot.from_connector_db_model(connector),
                credential=CredentialSnapshot.from_credential_db_model(credential),
                public_doc=credential.public_doc,
                owner=credential.user.email if credential.user else "",
                last_status=cc_pair.last_attempt_status,
                last_success=cc_pair.last_successful_index_time,
                docs_indexed=cc_pair.total_docs_indexed,
                error_msg=latest_index_attempt.error_msg
                if latest_index_attempt
                else None,
                latest_index_attempt=IndexAttemptSnapshot.from_index_attempt_db_model(
                    latest_index_attempt
                )
                if latest_index_attempt
                else None,
                deletion_attempt=get_deletion_status(
                    connector_id=connector.id, credential_id=credential.id
                ),
                is_deletable=check_deletion_attempt_is_allowed(
                    connector_credential_pair=cc_pair
                ),
            )
        )

    return indexing_statuses


@router.post("/admin/connector")
def create_connector_from_model(
    connector_info: ConnectorBase,
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> ObjectCreationIdResponse:
    try:
        return create_connector(connector_info, db_session)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/admin/connector/{connector_id}")
def update_connector_from_model(
    connector_id: int,
    connector_data: ConnectorBase,
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> ConnectorSnapshot | StatusResponse[int]:
    updated_connector = update_connector(connector_id, connector_data, db_session)
    if updated_connector is None:
        raise HTTPException(
            status_code=404, detail=f"Connector {connector_id} does not exist"
        )

    return ConnectorSnapshot(
        id=updated_connector.id,
        name=updated_connector.name,
        source=updated_connector.source,
        input_type=updated_connector.input_type,
        connector_specific_config=updated_connector.connector_specific_config,
        refresh_freq=updated_connector.refresh_freq,
        credential_ids=[
            association.credential.id for association in updated_connector.credentials
        ],
        time_created=updated_connector.time_created,
        time_updated=updated_connector.time_updated,
        disabled=updated_connector.disabled,
    )


@router.delete("/admin/connector/{connector_id}", response_model=StatusResponse[int])
def delete_connector_by_id(
    connector_id: int,
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> StatusResponse[int]:
    try:
        with db_session.begin():
            return delete_connector(db_session=db_session, connector_id=connector_id)
    except AssertionError:
        raise HTTPException(status_code=400, detail="Connector is not deletable")


@router.post("/admin/connector/run-once")
def connector_run_once(
    run_info: RunConnectorRequest,
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> StatusResponse[list[int]]:
    connector_id = run_info.connector_id
    specified_credential_ids = run_info.credential_ids
    try:
        possible_credential_ids = get_connector_credential_ids(
            run_info.connector_id, db_session
        )
    except ValueError:
        raise HTTPException(
            status_code=404,
            detail=f"Connector by id {connector_id} does not exist.",
        )

    if not specified_credential_ids:
        credential_ids = possible_credential_ids
    else:
        if set(specified_credential_ids).issubset(set(possible_credential_ids)):
            credential_ids = specified_credential_ids
        else:
            raise HTTPException(
                status_code=400,
                detail="Not all specified credentials are associated with connector",
            )

    if not credential_ids:
        raise HTTPException(
            status_code=400,
            detail="Connector has no valid credentials, cannot create index attempts.",
        )

    index_attempt_ids = [
        create_index_attempt(run_info.connector_id, credential_id, db_session)
        for credential_id in credential_ids
    ]
    return StatusResponse(
        success=True,
        message=f"Successfully created {len(index_attempt_ids)} index attempts",
        data=index_attempt_ids,
    )


@router.head("/admin/genai-api-key/validate")
def validate_existing_genai_api_key(
    _: User = Depends(current_admin_user),
) -> None:
    # OpenAI key is only used for generative QA, so no need to validate this
    # if it's turned off or if a non-OpenAI model is being used
    if DISABLE_GENERATIVE_AI or not get_default_qa_model().requires_api_key:
        return

    # Only validate every so often
    check_key_time = "genai_api_key_last_check_time"
    kv_store = get_dynamic_config_store()
    curr_time = datetime.now()
    try:
        last_check = datetime.fromtimestamp(cast(float, kv_store.load(check_key_time)))
        check_freq_sec = timedelta(seconds=GENERATIVE_MODEL_ACCESS_CHECK_FREQ)
        if curr_time - last_check < check_freq_sec:
            return
    except ConfigNotFoundError:
        # First time checking the key, nothing unusual
        pass

    try:
        genai_api_key = get_gen_ai_api_key()
    except ConfigNotFoundError:
        raise HTTPException(status_code=404, detail="Key not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    get_dynamic_config_store().store(check_key_time, curr_time.timestamp())

    try:
        is_valid = check_model_api_key_is_valid(genai_api_key)
    except ValueError:
        # this is the case where they aren't using an OpenAI-based model
        is_valid = True

    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid API key provided")


@router.get("/admin/genai-api-key", response_model=ApiKey)
def get_gen_ai_api_key_from_dynamic_config_store(
    _: User = Depends(current_admin_user),
) -> ApiKey:
    """
    NOTE: Only gets value from dynamic config store as to not expose env variables.
    """
    try:
        # only get last 4 characters of key to not expose full key
        return ApiKey(
            api_key=cast(
                str, get_dynamic_config_store().load(GEN_AI_API_KEY_STORAGE_KEY)
            )[-4:]
        )
    except ConfigNotFoundError:
        raise HTTPException(status_code=404, detail="Key not found")


@router.put("/admin/genai-api-key")
def store_genai_api_key(
    request: ApiKey,
    _: User = Depends(current_admin_user),
) -> None:
    try:
        is_valid = check_model_api_key_is_valid(request.api_key)
        if not is_valid:
            raise HTTPException(400, "Invalid API key provided")
        get_dynamic_config_store().store(GEN_AI_API_KEY_STORAGE_KEY, request.api_key)
    except RuntimeError as e:
        raise HTTPException(400, str(e))


@router.delete("/admin/genai-api-key")
def delete_genai_api_key(
    _: User = Depends(current_admin_user),
) -> None:
    get_dynamic_config_store().delete(GEN_AI_API_KEY_STORAGE_KEY)


@router.post("/admin/deletion-attempt")
def create_deletion_attempt_for_connector_id(
    connector_credential_pair_identifier: ConnectorCredentialPairIdentifier,
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    connector_id = connector_credential_pair_identifier.connector_id
    credential_id = connector_credential_pair_identifier.credential_id

    cc_pair = get_connector_credential_pair(
        db_session=db_session,
        connector_id=connector_id,
        credential_id=credential_id,
    )
    if cc_pair is None:
        raise HTTPException(
            status_code=404,
            detail=f"Connector with ID '{connector_id}' and credential ID "
            f"'{credential_id}' does not exist. Has it already been deleted?",
        )

    if not check_deletion_attempt_is_allowed(connector_credential_pair=cc_pair):
        raise HTTPException(
            status_code=400,
            detail=f"Connector with ID '{connector_id}' and credential ID "
            f"'{credential_id}' is not deletable. It must be both disabled AND have"
            "no ongoing / planned indexing attempts.",
        )

    task_id = get_cleanup_task_id(
        connector_id=connector_id, credential_id=credential_id
    )
    cleanup_connector_credential_pair_task.apply_async(
        kwargs=dict(connector_id=connector_id, credential_id=credential_id),
        task_id=task_id,
    )


"""Endpoints for basic users"""


@router.get("/get-user-role", response_model=UserRoleResponse)
async def get_user_role(user: User = Depends(current_user)) -> UserRoleResponse:
    if user is None:
        raise ValueError("Invalid or missing user.")
    return UserRoleResponse(role=user.role)


@router.get("/connector/google-drive/authorize/{credential_id}")
def google_drive_auth(
    response: Response, credential_id: str, _: User = Depends(current_user)
) -> AuthUrl:
    # set a cookie that we can read in the callback (used for `verify_csrf`)
    response.set_cookie(
        key=_GOOGLE_DRIVE_CREDENTIAL_ID_COOKIE_NAME,
        value=credential_id,
        httponly=True,
        max_age=600,
    )
    return AuthUrl(auth_url=get_auth_url(int(credential_id)))


@router.get("/connector/google-drive/callback")
def google_drive_callback(
    request: Request,
    callback: GDriveCallback = Depends(),
    user: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> StatusResponse:
    credential_id_cookie = request.cookies.get(_GOOGLE_DRIVE_CREDENTIAL_ID_COOKIE_NAME)
    if credential_id_cookie is None or not credential_id_cookie.isdigit():
        raise HTTPException(
            status_code=401, detail="Request did not pass CSRF verification."
        )
    credential_id = int(credential_id_cookie)
    verify_csrf(credential_id, callback.state)
    if (
        update_credential_access_tokens(callback.code, credential_id, user, db_session)
        is None
    ):
        raise HTTPException(
            status_code=500, detail="Unable to fetch Google Drive access tokens"
        )

    return StatusResponse(success=True, message="Updated Google Drive access tokens")


@router.get("/connector")
def get_connectors(
    _: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> list[ConnectorSnapshot]:
    connectors = fetch_connectors(db_session)
    return [
        ConnectorSnapshot.from_connector_db_model(connector) for connector in connectors
    ]


@router.get("/connector/{connector_id}")
def get_connector_by_id(
    connector_id: int,
    _: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> ConnectorSnapshot | StatusResponse[int]:
    connector = fetch_connector_by_id(connector_id, db_session)
    if connector is None:
        raise HTTPException(
            status_code=404, detail=f"Connector {connector_id} does not exist"
        )

    return ConnectorSnapshot(
        id=connector.id,
        name=connector.name,
        source=connector.source,
        input_type=connector.input_type,
        connector_specific_config=connector.connector_specific_config,
        refresh_freq=connector.refresh_freq,
        credential_ids=[
            association.credential.id for association in connector.credentials
        ],
        time_created=connector.time_created,
        time_updated=connector.time_updated,
        disabled=connector.disabled,
    )


@router.put("/connector/{connector_id}/credential/{credential_id}")
def associate_credential_to_connector(
    connector_id: int,
    credential_id: int,
    metadata: ConnectorCredentialPairMetadata,
    user: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> StatusResponse[int]:
    try:
        return add_credential_to_connector(
            connector_id=connector_id,
            credential_id=credential_id,
            cc_pair_name=metadata.name,
            user=user,
            db_session=db_session,
        )
    except IntegrityError:
        raise HTTPException(status_code=400, detail="Name must be unique")


@router.delete("/connector/{connector_id}/credential/{credential_id}")
def dissociate_credential_from_connector(
    connector_id: int,
    credential_id: int,
    user: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> StatusResponse[int]:
    return remove_credential_from_connector(
        connector_id, credential_id, user, db_session
    )
