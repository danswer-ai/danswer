from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Path
from sqlalchemy.orm import Session

from danswer.auth.users import current_user
from danswer.db.chat import get_chat_session_by_id
from danswer.db.engine import get_session
from danswer.db.folder import add_chat_to_folder
from danswer.db.folder import create_folder
from danswer.db.folder import delete_folder
from danswer.db.folder import remove_chat_from_folder
from danswer.db.folder import rename_folder
from danswer.db.models import User
from danswer.server.features.folder.models import DeleteFolderOptions
from danswer.server.features.folder.models import FolderChatSessionRequest
from danswer.server.features.folder.models import FolderCreationRequest
from danswer.server.features.folder.models import FolderUpdateRequest

router = APIRouter(prefix="/folder")


@router.post("/create")
def create_folder_endpoint(
    folder_creation_request: FolderCreationRequest,
    user: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> int:
    return create_folder(
        user_id=user.id if user else None,
        folder_name=folder_creation_request.folder_name,
        db_session=db_session,
    )


@router.patch("/update/{folder_id}")
def patch_folder_endpoint(
    folder_id: int = Path(..., description="The ID of the folder to rename"),
    request: FolderUpdateRequest = Depends(),
    user: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> None:
    try:
        rename_folder(
            user_id=user.id if user else None,
            folder_id=folder_id,
            folder_name=request.folder_name,
            db_session=db_session,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/add-chat-session/{folder_id}")
def add_chat_to_folder_endpoint(
    folder_id: int = Path(
        ..., description="The ID of the folder in which to add the chat session"
    ),
    request: FolderChatSessionRequest = Depends(),
    user: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> None:
    user_id = user.id if user else None
    try:
        chat_session = get_chat_session_by_id(
            chat_session_id=request.chat_session_id,
            user_id=user_id,
            db_session=db_session,
        )
        add_chat_to_folder(
            user_id=user.id if user else None,
            folder_id=folder_id,
            chat_session=chat_session,
            db_session=db_session,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/remove-chat-session/{folder_id}")
def remove_chat_from_folder_endpoint(
    folder_id: int = Path(
        ..., description="The ID of the folder from which to remove the chat session"
    ),
    request: FolderChatSessionRequest = Depends(),
    user: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> None:
    user_id = user.id if user else None
    try:
        chat_session = get_chat_session_by_id(
            chat_session_id=request.chat_session_id,
            user_id=user_id,
            db_session=db_session,
        )
        remove_chat_from_folder(
            user_id=user_id,
            folder_id=folder_id,
            chat_session=chat_session,
            db_session=db_session,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/delete-folder/{folder_id}")
def delete_folder_endpoint(
    folder_id: int = Path(..., description="The ID of the folder to delete"),
    options: DeleteFolderOptions = Depends(),
    user: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> None:
    user_id = user.id if user else None
    try:
        delete_folder(
            user_id=user_id,
            folder_id=folder_id,
            including_chats=options.including_chats,
            db_session=db_session,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
