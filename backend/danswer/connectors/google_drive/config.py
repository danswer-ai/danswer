from pydantic import BaseModel


class AuthStatus(BaseModel):
    authenticated: bool


class AuthUrl(BaseModel):
    auth_url: str


class AuthCode(BaseModel):
    auth_code: str
