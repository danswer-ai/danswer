from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ee.enmedd.db.teamspace import fetch_teamspace
from ee.enmedd.db.teamspace import fetch_teamspaces
from ee.enmedd.db.teamspace import fetch_teamspaces_for_user
from ee.enmedd.db.teamspace import insert_teamspace
from ee.enmedd.db.teamspace import prepare_teamspace_for_deletion
from ee.enmedd.db.teamspace import update_teamspace
from ee.enmedd.db.teamspace import update_user_curator_relationship
from ee.enmedd.server.teamspace.models import SetCuratorRequest
from ee.enmedd.server.teamspace.models import Teamspace
from ee.enmedd.server.teamspace.models import TeamspaceCreate
from ee.enmedd.server.teamspace.models import TeamspaceUpdate
from enmedd.auth.users import current_admin_user
from enmedd.auth.users import current_curator_or_admin_user
from enmedd.db.engine import get_session
from enmedd.db.models import User
from enmedd.db.models import UserRole
from enmedd.utils.logger import setup_logger

logger = setup_logger()

router = APIRouter(prefix="/manage")


@router.get("/admin/teamspace/{teamspace_id}")
def get_teamspace_by_id(
    teamspace_id: int,
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> Teamspace:
    db_teamspace = fetch_teamspace(db_session, teamspace_id)
    if db_teamspace is None:
        raise HTTPException(
            status_code=404, detail=f"Teamspace with id '{teamspace_id}' not found"
        )
    return Teamspace.from_model(db_teamspace)


@router.get("/admin/teamspace")
def list_teamspaces(
    user: User | None = Depends(current_curator_or_admin_user),
    db_session: Session = Depends(get_session),
) -> list[Teamspace]:
    if user is None or user.role == UserRole.ADMIN:
        teamspaces = fetch_teamspaces(db_session, only_up_to_date=False)
    else:
        teamspaces = fetch_teamspaces_for_user(
            db_session=db_session,
            user_id=user.id,
            only_curator_groups=user.role == UserRole.CURATOR,
        )
    return [Teamspace.from_model(teamspace) for teamspace in teamspaces]


@router.post("/admin/teamspace")
def create_teamspace(
    teamspace: TeamspaceCreate,
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> Teamspace:
    try:
        # TODO: revert it back to having creator id
        db_teamspace = insert_teamspace(db_session, teamspace)
    except IntegrityError:
        raise HTTPException(
            400,
            f"Teamspace with name '{teamspace.name}' already exists. Please "
            + "choose a different name.",
        )
    return Teamspace.from_model(db_teamspace)


@router.patch("/admin/teamspace/{teamspace_id}")
def patch_teamspace(
    teamspace_id: int,
    teamspace_update: TeamspaceUpdate,
    user: User | None = Depends(current_curator_or_admin_user),
    db_session: Session = Depends(get_session),
) -> Teamspace:
    try:
        return Teamspace.from_model(
            update_teamspace(
                db_session=db_session,
                user=user,
                teamspace_id=teamspace_id,
                teamspace_update=teamspace_update,
            )
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/admin/teamspace/{teamspace_id}/set-curator")
def set_user_curator(
    teamspace_id: int,
    set_curator_request: SetCuratorRequest,
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    try:
        update_user_curator_relationship(
            db_session=db_session,
            teamspace_id=teamspace_id,
            set_curator_request=set_curator_request,
        )
    except ValueError as e:
        logger.error(f"Error setting user curator: {e}")
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/admin/teamspace/{teamspace_id}")
def delete_teamspace(
    teamspace_id: int,
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    try:
        prepare_teamspace_for_deletion(db_session, teamspace_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
