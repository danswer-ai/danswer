from typing import Annotated

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query
from fastapi import Request
from sqlalchemy.orm import Session

from danswer.auth.users import current_user
from danswer.connectors.interfaces import OAuthConnector
from danswer.db.credentials import create_credential
from danswer.db.engine import get_session
from danswer.db.models import User
from danswer.server.documents.models import CredentialBase
from danswer.utils.logger import setup_logger
from danswer.utils.subclasses import find_all_subclasses_in_dir

logger = setup_logger()

router = APIRouter(prefix="/connector/oauth")

# Cache for OAuth connectors, populated at module load time
_OAUTH_CONNECTORS: dict[str, type[OAuthConnector]] = {}


def _discover_oauth_connectors() -> dict[str, type[OAuthConnector]]:
    """Walk through the connectors package to find all OAuthConnector implementations"""
    global _OAUTH_CONNECTORS
    if _OAUTH_CONNECTORS:  # Return cached connectors if already discovered
        return _OAUTH_CONNECTORS

    oauth_connectors = find_all_subclasses_in_dir(OAuthConnector, "danswer.connectors")

    _OAUTH_CONNECTORS = {cls.oauth_id(): cls for cls in oauth_connectors}
    return _OAUTH_CONNECTORS


# Discover OAuth connectors at module load time
_discover_oauth_connectors()


@router.get("/authorize/{source}")
def oauth_authorize(
    request: Request,
    source: str,
    _: User = Depends(current_user),
) -> dict:
    """Initiates the OAuth flow by redirecting to the provider's auth page"""
    oauth_connectors = _discover_oauth_connectors()

    if source not in oauth_connectors:
        raise HTTPException(status_code=400, detail=f"Unknown OAuth source: {source}")

    connector_cls = oauth_connectors[source]
    base_url = str(request.base_url)
    if "127.0.0.1" in base_url:
        base_url = base_url.replace("127.0.0.1", "localhost")
    return {"redirect_url": connector_cls.redirect_uri(base_url)}


@router.get("/callback/{source}")
async def oauth_callback(
    source: str,
    code: Annotated[str, Query()],
    state: Annotated[str | None, Query()] = None,
    db_session: Session = Depends(get_session),
    user: User = Depends(current_user),
) -> dict:
    """Handles the OAuth callback and exchanges the code for tokens"""
    oauth_connectors = _discover_oauth_connectors()

    if source not in oauth_connectors:
        raise HTTPException(status_code=400, detail=f"Unknown OAuth source: {source}")

    connector_cls = oauth_connectors[source]

    try:
        token_info = connector_cls.code_to_token(code)

        # Create a new credential with the token info
        credential_data = CredentialBase(
            credential_json=token_info,
            admin_public=True,  # Or based on some logic/parameter
            source=source,
            name=f"{source.title()} OAuth Credential",
        )

        credential = create_credential(
            credential_data=credential_data,
            user=user,
            db_session=db_session,
        )

        return {
            "credential_id": credential.id,
            "token_info": token_info,
            "message": "Successfully authenticated and created credential",
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
