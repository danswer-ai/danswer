from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import enmedd.db.models as db_models
from ee.enmedd.db.teamspace import fetch_teamspaces
from ee.enmedd.db.teamspace import insert_teamspace
from ee.enmedd.db.teamspace import prepare_teamspace_for_deletion
from ee.enmedd.db.teamspace import update_teamspace
from ee.enmedd.server.teamspace.models import Teamspace
from ee.enmedd.server.teamspace.models import TeamspaceCreate
from ee.enmedd.server.teamspace.models import TeamspaceUpdate
from enmedd.auth.users import current_admin_user
from enmedd.db.engine import get_session

router = APIRouter(prefix="/manage")


@router.get("/admin/teamspace")
def list_teamspaces(
    _: db_models.User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> list[Teamspace]:
    teamspaces = fetch_teamspaces(db_session, only_current=False)
    return [Teamspace.from_model(teamspace) for teamspace in teamspaces]


@router.post("/admin/teamspace")
def create_teamspace(
    teamspace: TeamspaceCreate,
    _: db_models.User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> Teamspace:
    try:
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
    teamspace: TeamspaceUpdate,
    _: db_models.User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> Teamspace:
    try:
        return Teamspace.from_model(
            update_teamspace(db_session, teamspace_id, teamspace)
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/admin/teamspace/{teamspace_id}")
def delete_teamspace(
    teamspace_id: int,
    _: db_models.User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    try:
        prepare_teamspace_for_deletion(db_session, teamspace_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
