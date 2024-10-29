from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Response
from fastapi import UploadFile
from sqlalchemy.orm import Session

from ee.enmedd.db.teamspace import fetch_teamspace
from ee.enmedd.db.teamspace import fetch_teamspaces
from ee.enmedd.db.teamspace import fetch_teamspaces_for_user
from ee.enmedd.db.teamspace import insert_teamspace
from ee.enmedd.db.teamspace import prepare_teamspace_for_deletion
from ee.enmedd.db.teamspace import update_teamspace
from ee.enmedd.server.teamspace.models import Teamspace
from ee.enmedd.server.teamspace.models import TeamspaceCreate
from ee.enmedd.server.teamspace.models import TeamspaceUpdate
from ee.enmedd.server.teamspace.models import TeamspaceUpdateName
from ee.enmedd.server.teamspace.models import TeamspaceUserRole
from ee.enmedd.server.teamspace.models import UpdateUserRoleRequest
from ee.enmedd.server.workspace.store import _LOGO_FILENAME
from ee.enmedd.server.workspace.store import upload_teamspace_logo
from enmedd.auth.users import current_admin_user
from enmedd.auth.users import current_teamspace_admin_user
from enmedd.auth.users import current_user
from enmedd.db.engine import get_session
from enmedd.db.models import Teamspace as TeamspaceModel
from enmedd.db.models import User
from enmedd.db.models import User__Teamspace
from enmedd.db.models import UserRole
from enmedd.db.users import get_user_by_email
from enmedd.file_store.file_store import get_default_file_store
from enmedd.utils.logger import setup_logger

logger = setup_logger()

admin_router = APIRouter(prefix="/manage")
basic_router = APIRouter(prefix="/teamspace")


@admin_router.get("/admin/teamspace/{teamspace_id}")
def get_teamspace_by_id(
    teamspace_id: int,
    _: User = Depends(current_teamspace_admin_user),
    db_session: Session = Depends(get_session),
) -> Teamspace:
    db_teamspace = fetch_teamspace(db_session, teamspace_id)
    if db_teamspace is None:
        raise HTTPException(
            status_code=404, detail=f"Teamspace with id '{teamspace_id}' not found"
        )
    return Teamspace.from_model(db_teamspace)


@admin_router.get("/admin/teamspace")
def list_teamspaces(
    user: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> list[Teamspace]:
    if user is None or user.role == UserRole.ADMIN:
        teamspaces = fetch_teamspaces(db_session, only_up_to_date=False)
    else:
        teamspaces = fetch_teamspaces_for_user(
            db_session=db_session,
            user_id=user.id,
        )
    return [Teamspace.from_model(teamspace) for teamspace in teamspaces]


@admin_router.post("/admin/teamspace")
def create_teamspace(
    teamspace: TeamspaceCreate,
    current_user: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> Teamspace:
    # try:
    db_teamspace = insert_teamspace(db_session, teamspace, creator_id=current_user.id)
    # except IntegrityError:
    #     raise HTTPException(
    #         400,
    #         f"Teamspace with name '{teamspace.name}' already exists. Please "
    #         + "choose a different name.",
    #     )
    return Teamspace.from_model(db_teamspace)


@admin_router.patch("/admin/teamspace/{teamspace_id}")
def patch_teamspace(
    teamspace_id: int,
    teamspace: TeamspaceUpdate,
    _: User = Depends(current_teamspace_admin_user),
    db_session: Session = Depends(get_session),
) -> Teamspace:
    try:
        return Teamspace.from_model(
            update_teamspace(db_session, teamspace_id, teamspace)
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@admin_router.delete("/admin/teamspace/{teamspace_id}")
def delete_teamspace(
    teamspace_id: int,
    _: User = Depends(current_teamspace_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    try:
        prepare_teamspace_for_deletion(db_session, teamspace_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@admin_router.patch("/admin/teamspace")
def update_teamspace_name(
    teamspace_id: int,
    teamspace_update: TeamspaceUpdateName,
    _: User = Depends(current_teamspace_admin_user),
    db_session: Session = Depends(get_session),
) -> Teamspace:
    db_teamspace = fetch_teamspace(db_session, teamspace_id)

    if db_teamspace is None:
        raise HTTPException(
            status_code=404, detail=f"Teamspace with id '{teamspace_id}' not found"
        )

    if (
        db_session.query(TeamspaceModel)
        .filter(
            TeamspaceModel.name == teamspace_update.name,
            TeamspaceModel.id != teamspace_id,
        )
        .first()
    ):
        raise HTTPException(
            status_code=400,
            detail=f"Teamspace with name '{teamspace_update.name}' already exists. Please choose a different name.",
        )

    db_teamspace.name = teamspace_update.name
    db_session.commit()

    return Teamspace.from_model(db_teamspace)


@admin_router.patch("/admin/teamspace/user-role/{teamspace_id}")
def update_teamspace_user_role(
    teamspace_id: int,
    body: UpdateUserRoleRequest,
    user: User = Depends(current_teamspace_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    user_to_update = get_user_by_email(email=body.user_email, db_session=db_session)
    if not user_to_update:
        raise HTTPException(status_code=404, detail="User not found")

    if user_to_update.id == user.id and body.new_role != TeamspaceUserRole.ADMIN:
        raise HTTPException(
            status_code=400, detail="Cannot demote yourself from admin role!"
        )

    user_teamspace = (
        db_session.query(User__Teamspace)
        .filter(
            User__Teamspace.user_id == user_to_update.id,
            User__Teamspace.teamspace_id == teamspace_id,
        )
        .first()
    )

    if not user_teamspace:
        raise HTTPException(
            status_code=404, detail="User-Teamspace relationship not found"
        )

    user_teamspace.role = body.new_role

    db_session.commit()

    return {
        "message": f"User role updated to {body.new_role.value} for {body.user_email}"
    }


@admin_router.put("/admin/teamspace/logo")
def put_teamspace_logo(
    teamspace_id: int,
    file: UploadFile,
    _: User = Depends(current_teamspace_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    upload_teamspace_logo(teamspace_id=teamspace_id, file=file, db_session=db_session)


@admin_router.delete("/admin/teamspace/{teamspace_id}/logo")
def remove_teamspace_logo(
    teamspace_id: int,
    db_session: Session = Depends(get_session),
    _: User = Depends(current_teamspace_admin_user),
) -> None:
    try:
        file_name = f"{teamspace_id}{_LOGO_FILENAME}"

        file_store = get_default_file_store(db_session)
        file_store.delete_file(file_name)

        teamspace = db_session.query(TeamspaceModel).filter_by(id=teamspace_id).first()
        if not teamspace:
            raise HTTPException(status_code=404, detail="Teamspace not found")

        teamspace.logo = None
        db_session.merge(teamspace)
        db_session.commit()

        return {"detail": "Teamspace logo removed successfully."}

    except Exception as e:
        logger.error(f"Error removing teamspace logo: {str(e)}")
        raise HTTPException(status_code=404, detail="Teamspace logo not found.")


@basic_router.get("/logo")
def fetch_teamspace_logo(
    teamspace_id: int,
    _: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> Response:
    try:
        file_path = f"{teamspace_id}{_LOGO_FILENAME}"

        file_store = get_default_file_store(db_session)
        file_io = file_store.read_file(file_path, mode="b")

        return Response(content=file_io.read(), media_type="image/jpeg")
    except Exception:
        raise HTTPException(
            status_code=404, detail="No logo file found for the teamspace"
        )
