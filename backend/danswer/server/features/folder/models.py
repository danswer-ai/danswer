from pydantic import BaseModel


class FolderChatMinimalInfo(BaseModel):
    chat_session_id: int
    chat_session_name: str


class FolderResponse(BaseModel):
    chat_sessions: list[FolderChatMinimalInfo]


class GetUserFoldersResponse(BaseModel):
    folders: FolderResponse


class FolderCreationRequest(BaseModel):
    folder_name: str | None = None


class FolderUpdateRequest(BaseModel):
    folder_name: str | None


class FolderChatSessionRequest(BaseModel):
    chat_session_id: int


class DeleteFolderOptions(BaseModel):
    including_chats: bool = False
