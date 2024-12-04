from typing import List

from fastapi import APIRouter
from pydantic import BaseModel


router = APIRouter()


class FolderResponse(BaseModel):
    id: int
    name: str
    parent_id: int | None = None


class FolderDetailResponse(FolderResponse):
    children: List[FolderResponse]
    files: List[dict]


class FolderFullDetailResponse(FolderDetailResponse):
    parents: List[FolderResponse]


class FileResponse(BaseModel):
    id: int
    name: str
    parent_folder_id: int | None = None


class MessageResponse(BaseModel):
    message: str
