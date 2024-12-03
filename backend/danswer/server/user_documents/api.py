from typing import List

from fastapi import APIRouter
from fastapi import Depends
from fastapi import File
from fastapi import HTTPException
from fastapi import UploadFile
from sqlalchemy.orm import Session

from danswer.auth.users import current_user
from danswer.db.engine import get_session
from danswer.db.models import User
from danswer.db.models import UserFile
from danswer.db.models import UserFolder
from danswer.server.documents.connector import upload_files
from danswer.server.documents.models import FileUploadResponse
from danswer.server.user_documents.models import FileResponse
from danswer.server.user_documents.models import FolderDetailResponse
from danswer.server.user_documents.models import FolderResponse
from danswer.server.user_documents.models import MessageResponse

router = APIRouter()


@router.post("/user/folder", response_model=FolderResponse)
def create_folder(
    name: str,
    parent_id: int | None = None,
    user: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> FolderResponse:
    new_folder = UserFolder(user_id=user.id, parent_id=parent_id, name=name)
    db_session.add(new_folder)
    db_session.commit()
    return FolderResponse(
        id=new_folder.id, name=new_folder.name, parent_id=new_folder.parent_id
    )


@router.get("/user/folder/{folder_id}", response_model=FolderDetailResponse)
def get_folder(
    folder_id: int,
    user: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> FolderDetailResponse:
    folder = (
        db_session.query(UserFolder)
        .filter(UserFolder.id == folder_id, UserFolder.user_id == user.id)
        .first()
    )
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    return FolderDetailResponse(
        id=folder.id,
        name=folder.name,
        parent_id=folder.parent_id,
        children=[
            FolderResponse(id=child.id, name=child.name, parent_id=child.parent_id)
            for child in folder.children
        ],
        files=[{"id": file.id, "name": file.name} for file in folder.files],
    )


@router.post("/user/file/upload", response_model=FileUploadResponse)
async def upload_user_files(
    files: List[UploadFile] = File(...),
    folder_id: int | None = None,
    user: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> FileUploadResponse:
    upload_response = upload_files(files, user, db_session)

    for file_path, file in zip(upload_response.file_paths, files):
        new_file = UserFile(
            user_id=user.id,
            parent_folder_id=folder_id,
            file_id=file_path,
            document_id=file_path,  # We'll use the same ID for now
            name=file.filename,
        )
        db_session.add(new_file)

    db_session.commit()
    return upload_response


@router.put("/user/folder/{folder_id}", response_model=FolderResponse)
def update_folder(
    folder_id: int,
    name: str,
    user: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> FolderResponse:
    folder = (
        db_session.query(UserFolder)
        .filter(UserFolder.id == folder_id, UserFolder.user_id == user.id)
        .first()
    )
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    folder.name = name
    db_session.commit()
    return FolderResponse(id=folder.id, name=folder.name, parent_id=folder.parent_id)


@router.delete("/user/folder/{folder_id}", response_model=MessageResponse)
def delete_folder(
    folder_id: int,
    user: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> MessageResponse:
    folder = (
        db_session.query(UserFolder)
        .filter(UserFolder.id == folder_id, UserFolder.user_id == user.id)
        .first()
    )
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    db_session.delete(folder)
    db_session.commit()
    return MessageResponse(message="Folder deleted successfully")


@router.put("/user/folder/{folder_id}/move", response_model=FolderResponse)
def move_folder(
    folder_id: int,
    new_parent_id: int | None,
    user: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> FolderResponse:
    folder = (
        db_session.query(UserFolder)
        .filter(UserFolder.id == folder_id, UserFolder.user_id == user.id)
        .first()
    )
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    folder.parent_id = new_parent_id
    db_session.commit()
    return FolderResponse(id=folder.id, name=folder.name, parent_id=folder.parent_id)


@router.delete("/user/file/{file_id}", response_model=MessageResponse)
def delete_file(
    file_id: int,
    user: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> MessageResponse:
    file = (
        db_session.query(UserFile)
        .filter(UserFile.id == file_id, UserFile.user_id == user.id)
        .first()
    )
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    db_session.delete(file)
    db_session.commit()
    return MessageResponse(message="File deleted successfully")


@router.put("/user/file/{file_id}/move", response_model=FileResponse)
def move_file(
    file_id: int,
    new_folder_id: int | None,
    user: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> FileResponse:
    file = (
        db_session.query(UserFile)
        .filter(UserFile.id == file_id, UserFile.user_id == user.id)
        .first()
    )
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    file.parent_folder_id = new_folder_id
    db_session.commit()
    return FileResponse(
        id=file.id, name=file.name, parent_folder_id=file.parent_folder_id
    )


# Add more endpoints for updating, deleting, and moving folders/files
