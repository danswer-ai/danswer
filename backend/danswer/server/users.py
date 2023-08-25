from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi_users.db import SQLAlchemyUserDatabase
from fastapi_users_db_sqlalchemy import UUID_ID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from danswer.auth.schemas import UserRead
from danswer.auth.schemas import UserRole
from danswer.auth.users import current_admin_user
from danswer.db.engine import get_session
from danswer.db.engine import get_sqlalchemy_async_engine
from danswer.db.models import User
from danswer.db.users import list_users
from danswer.server.models import UserByEmail


router = APIRouter(prefix="/manage")


@router.patch("/promote-user-to-admin")
async def promote_admin(
    user_email: UserByEmail, user: User = Depends(current_admin_user)
) -> None:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=401, detail="Unauthorized")
    async with AsyncSession(get_sqlalchemy_async_engine()) as asession:
        user_db = SQLAlchemyUserDatabase[User, UUID_ID](asession, User)
        user_to_promote = await user_db.get_by_email(user_email.user_email)
        if not user_to_promote:
            raise HTTPException(status_code=404, detail="User not found")
        user_to_promote.role = UserRole.ADMIN
        asession.add(user_to_promote)
        await asession.commit()
    return


@router.get("/users")
def list_all_users(
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> list[UserRead]:
    users = list_users(db_session)
    return [UserRead.from_orm(user) for user in users]
