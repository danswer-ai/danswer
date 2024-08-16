from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from danswer.auth.users import current_admin_user
from danswer.db.engine import get_session
from danswer.db.models import User
from danswer.db.users import fetch_user_by_id
from ee.danswer.db.user_group import fetch_user_groups
from ee.danswer.db.user_group import insert_user_group
from ee.danswer.db.user_group import prepare_user_group_for_deletion
from ee.danswer.db.user_group import update_user_group
from ee.danswer.db.user_group import update_user_group_role
from ee.danswer.db.user_group import validate_curator_status
from ee.danswer.server.user_group.models import SetCuratorRequest
from ee.danswer.server.user_group.models import UserGroup
from ee.danswer.server.user_group.models import UserGroupCreate
from ee.danswer.server.user_group.models import UserGroupUpdate

router = APIRouter(prefix="/manage")


@router.get("/admin/user-group")
def list_user_groups(
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> list[UserGroup]:
    user_groups = fetch_user_groups(db_session, only_current=False)
    return [UserGroup.from_model(user_group) for user_group in user_groups]


@router.post("/admin/user-group")
def create_user_group(
    user_group: UserGroupCreate,
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> UserGroup:
    try:
        db_user_group = insert_user_group(db_session, user_group)
    except IntegrityError:
        raise HTTPException(
            400,
            f"User group with name '{user_group.name}' already exists. Please "
            + "choose a different name.",
        )
    return UserGroup.from_model(db_user_group)


@router.patch("/admin/user-group/{user_group_id}")
def patch_user_group(
    user_group_id: int,
    user_group_update: UserGroupUpdate,
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> UserGroup:
    try:
        return UserGroup.from_model(
            update_user_group(db_session, user_group_id, user_group_update)
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/admin/user-group/{user_group_id}/set-curator")
def patch_user_group_role(
    user_group_id: int,
    set_curator_request: SetCuratorRequest,
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    try:
        update_user_group_role(db_session, user_group_id, set_curator_request)
        user = fetch_user_by_id(db_session, set_curator_request.user_id)
        validate_curator_status(db_session, [user])
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/admin/user-group/{user_group_id}")
def delete_user_group(
    user_group_id: int,
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    try:
        prepare_user_group_for_deletion(db_session, user_group_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
