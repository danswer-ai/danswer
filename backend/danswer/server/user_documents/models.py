from typing import List

from fastapi import APIRouter
from pydantic import BaseModel


router = APIRouter()


class FolderResponse(BaseModel):
    id: int
    name: str
    parent_id: int | None


class FolderDetailResponse(FolderResponse):
    children: List[FolderResponse]
    files: List[dict]


class FileResponse(BaseModel):
    id: int
    name: str
    parent_folder_id: int | None


class MessageResponse(BaseModel):
    message: str
