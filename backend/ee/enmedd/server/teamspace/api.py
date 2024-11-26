from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Response
from fastapi import UploadFile
from sqlalchemy.orm import Session

from ee.enmedd.db.teamspace import check_assistant_document_set
from ee.enmedd.db.teamspace import check_document_set_connector_credential_pair
from ee.enmedd.db.teamspace import fetch_teamspace
from ee.enmedd.db.teamspace import insert_teamspace
from ee.enmedd.db.teamspace import prepare_teamspace_for_deletion
from ee.enmedd.db.teamspace import update_teamspace
from ee.enmedd.server.teamspace.models import Teamspace
from ee.enmedd.server.teamspace.models import TeamspaceCreate
from ee.enmedd.server.teamspace.models import TeamspaceUpdate
from ee.enmedd.server.teamspace.models import TeamspaceUpdateName
from ee.enmedd.server.teamspace.models import TeamspaceUserRole
from ee.enmedd.server.teamspace.models import UpdateUserRoleRequest
from ee.enmedd.server.workspace.store import _TEAMSPACELOGO_FILENAME
from ee.enmedd.server.workspace.store import upload_teamspace_logo
from enmedd.auth.users import current_teamspace_admin_user
from enmedd.auth.users import current_user
from enmedd.auth.users import current_workspace_admin_user
from enmedd.db.engine import get_session
from enmedd.db.models import Teamspace as TeamspaceModel
from enmedd.db.models import Teamspace__ConnectorCredentialPair
from enmedd.db.models import User
from enmedd.db.models import User__Teamspace
from enmedd.db.models import UserRole
from enmedd.db.users import get_user_by_email
from enmedd.file_store.file_store import get_default_file_store
from enmedd.server.settings.models import Settings
from enmedd.server.settings.store import store_settings
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
    teamspace_model = (
        db_session.query(TeamspaceModel)
        .filter(TeamspaceModel.id == teamspace_id)
        .first()
    )

    if teamspace_model is None:
        raise HTTPException(status_code=404, detail="Teamspace not found")

    user_roles = (
        db_session.query(User__Teamspace)
        .filter(User__Teamspace.teamspace_id == teamspace_id)
        .all()
    )

    user_role_dict = {ur.user_id: ur.role for ur in user_roles}
    for user in teamspace_model.users:
        user.role = user_role_dict.get(user.id, UserRole.BASIC)

    teamspace_data = Teamspace.from_model(teamspace_model)

    return teamspace_data


# fetch all teamspaces for the user
@basic_router.get("/user-list")
def list_user_teamspaces(
    user: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> list[Teamspace]:
    teamspaces = (
        db_session.query(TeamspaceModel)
        .filter(TeamspaceModel.is_up_for_deletion == False)  # noqa E712
        .join(User__Teamspace)
        .filter(User__Teamspace.user_id == user.id)
        .all()
    )

    teamspace_list = []

    for teamspace_model in teamspaces:
        user_roles = (
            db_session.query(User__Teamspace)
            .filter(User__Teamspace.teamspace_id == teamspace_model.id)
            .all()
        )

        user_role_dict = {ur.user_id: ur.role for ur in user_roles}

        for user in teamspace_model.users:
            user.role = user_role_dict.get(user.id, UserRole.BASIC)

        teamspace_data = Teamspace.from_model(teamspace_model)
        teamspace_list.append(teamspace_data)

    return teamspace_list


@admin_router.get("/admin/teamspace")
def list_teamspaces(
    user: User | None = Depends(current_workspace_admin_user),
    db_session: Session = Depends(get_session),
    include_deleted: bool = False,
) -> list[Teamspace]:
    if include_deleted:
        teamspaces = db_session.query(TeamspaceModel).all()
    else:
        teamspaces = (
            db_session.query(TeamspaceModel)
            .filter(TeamspaceModel.is_up_for_deletion == False)  # noqa E712
            .all()
        )

    teamspace_list = []

    for teamspace_model in teamspaces:
        user_roles = (
            db_session.query(User__Teamspace)
            .filter(User__Teamspace.teamspace_id == teamspace_model.id)
            .all()
        )

        user_role_dict = {ur.user_id: ur.role for ur in user_roles}

        for user in teamspace_model.users:
            user.role = user_role_dict.get(user.id, UserRole.BASIC)

        teamspace_data = Teamspace.from_model(teamspace_model)
        teamspace_list.append(teamspace_data)

    return teamspace_list


@admin_router.post("/admin/teamspace")
def create_teamspace(
    teamspace: TeamspaceCreate,
    current_user: User = Depends(current_workspace_admin_user),
    db_session: Session = Depends(get_session),
) -> Teamspace:
    try:
        updated_document_set_ids = set()
        for assistant_id in teamspace.assistant_ids:
            updated_document_set_ids.update(
                check_assistant_document_set(
                    db_session=db_session,
                    assistant_id=assistant_id,
                    document_set_ids=teamspace.document_set_ids,
                )
            )
        teamspace.document_set_ids = list(updated_document_set_ids)

        updated_cc_pair_ids = set(
            check_document_set_connector_credential_pair(
                db_session=db_session,
                document_set_ids=teamspace.document_set_ids,
                cc_pair_ids=teamspace.cc_pair_ids,
            )
        )
        teamspace.cc_pair_ids = list(updated_cc_pair_ids)

        db_teamspace = insert_teamspace(
            db_session, teamspace, creator_id=current_user.id
        )
        default_settings = Settings()
        store_settings(
            settings=default_settings,
            db_session=db_session,
            teamspace_id=db_teamspace.id,
        )

        return Teamspace.from_model(db_teamspace)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create teamspace: {str(e)}",
        )


@admin_router.patch("/admin/teamspace/{teamspace_id}")
def patch_teamspace(
    teamspace_id: int,
    teamspace: TeamspaceUpdate,
    _: User = Depends(current_workspace_admin_user or current_teamspace_admin_user),
    db_session: Session = Depends(get_session),
) -> Teamspace:
    try:
        updated_document_set_ids = set()
        updated_cc_pair_ids = set()

        for assistant_id in teamspace.assistant_ids:
            updated_document_set_ids.update(
                check_assistant_document_set(
                    db_session=db_session,
                    assistant_id=assistant_id,
                    document_set_ids=teamspace.document_set_ids,
                )
            )

        teamspace.document_set_ids = list(updated_document_set_ids)

        for document_set_id in teamspace.document_set_ids:
            updated_cc_pair_ids.update(
                check_document_set_connector_credential_pair(
                    db_session=db_session,
                    document_set_ids=[document_set_id],
                    cc_pair_ids=teamspace.cc_pair_ids,
                )
            )

        teamspace.cc_pair_ids = list(updated_cc_pair_ids)

        return Teamspace.from_model(
            update_teamspace(db_session, teamspace_id, teamspace)
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@admin_router.delete("/admin/teamspace/{teamspace_id}")
def delete_teamspace(
    teamspace_id: int,
    _: User = Depends(current_workspace_admin_user or current_teamspace_admin_user),
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


# Leave current user to teamspace admin can leave but not the creator
@basic_router.delete("/leave/{teamspace_id}")
def leave_teamspace(
    teamspace_id: int,
    user: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> None:
    teamspace = db_session.query(TeamspaceModel).filter_by(id=teamspace_id).first()
    if not teamspace:
        raise HTTPException(status_code=404, detail="Teamspace not found")

    # Creator can only leave if there are other admins
    if user.id == teamspace.creator_id:
        other_admins_exist = (
            db_session.query(User__Teamspace)
            .filter(
                User__Teamspace.teamspace_id == teamspace_id,
                User__Teamspace.role == TeamspaceUserRole.ADMIN,
                User__Teamspace.user_id != user.id,
            )
            .first()
            is not None
        )
        if not other_admins_exist:
            raise HTTPException(
                status_code=400,
                detail="Creator cannot leave the teamspace as no other admins are present",
            )

    user_teamspace = (
        db_session.query(User__Teamspace)
        .filter_by(teamspace_id=teamspace_id, user_id=user.id)
        .first()
    )

    if not user_teamspace:
        raise HTTPException(status_code=404, detail="User not found in the teamspace")

    db_session.delete(user_teamspace)
    db_session.commit()

    return {"message": "You have left the teamspace successfully"}


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

    # if (
    #     user_teamspace.role == TeamspaceUserRole.ADMIN
    #     and body.new_role != TeamspaceUserRole.ADMIN
    # ):
    #     raise HTTPException(status_code=400, detail="Cannot demote another admin!")

    user_teamspace.role = body.new_role
    db_session.commit()

    return {
        "message": f"User role updated to {body.new_role.value} for {body.user_email}"
    }


@admin_router.post("/admin/teamspace/user-add/{teamspace_id}")
def add_teamspace_users(
    teamspace_id: int,
    emails: list[str],
    _: User = Depends(current_workspace_admin_user or current_teamspace_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    added_users = []
    for email in emails:
        user_to_add = get_user_by_email(email=email, db_session=db_session)
        if not user_to_add:
            raise HTTPException(
                status_code=404, detail=f"User not found for email: {email}"
            )

        existing_record = (
            db_session.query(User__Teamspace)
            .filter_by(teamspace_id=teamspace_id, user_id=user_to_add.id)
            .first()
        )
        if existing_record:
            raise HTTPException(
                status_code=400,
                detail=f"User with email {email} is already in the teamspace",
            )

        new_user_teamspace = User__Teamspace(
            teamspace_id=teamspace_id,
            user_id=user_to_add.id,
            role=TeamspaceUserRole.BASIC,
        )
        db_session.add(new_user_teamspace)
        added_users.append(email)

    db_session.commit()
    return {
        "message": f"Users added to teamspace: {', '.join(added_users)}",
    }


@admin_router.delete("/admin/teamspace/user-remove/{teamspace_id}")
def remove_teamspace_users(
    teamspace_id: int,
    emails: list[str],
    user: User = Depends(current_teamspace_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    teamspace = db_session.query(TeamspaceModel).filter_by(id=teamspace_id).first()
    if not teamspace:
        raise HTTPException(status_code=404, detail="Teamspace not found")

    is_creator = user.id == teamspace.creator_id
    removed_users = []

    for email in emails:
        user_to_remove = get_user_by_email(email=email, db_session=db_session)
        if not user_to_remove:
            raise HTTPException(
                status_code=404, detail=f"User not found for email: {email}"
            )

        user_teamspace = (
            db_session.query(User__Teamspace)
            .filter_by(teamspace_id=teamspace_id, user_id=user_to_remove.id)
            .first()
        )
        if not user_teamspace:
            raise HTTPException(
                status_code=404,
                detail=f"User with email {email} not found in teamspace",
            )

        if user_teamspace.role == TeamspaceUserRole.ADMIN and not is_creator:
            raise HTTPException(
                status_code=403,
                detail=f"Cannot remove admin with email: {email}",
            )

        db_session.delete(user_teamspace)
        removed_users.append(email)

    db_session.commit()
    return {
        "message": f"Users removed from teamspace: {', '.join(removed_users)}",
    }


@admin_router.delete("/admin/teamspace/connector-remove/{teamspace_id}")
def remove_teamspace_connector(
    teamspace_id: int,
    cc_pair_id: int,
    _: User = Depends(current_teamspace_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    connector_pair = (
        db_session.query(Teamspace__ConnectorCredentialPair)
        .filter_by(teamspace_id=teamspace_id, cc_pair_id=cc_pair_id)
        .first()
    )

    if not connector_pair:
        raise HTTPException(
            status_code=404, detail="Connector pair not found for the given teamspace."
        )

    db_session.delete(connector_pair)
    db_session.commit()

    return {"message": "Connector removed successfully"}


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
        file_name = f"{teamspace_id}{_TEAMSPACELOGO_FILENAME}"

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
        file_path = f"{teamspace_id}{_TEAMSPACELOGO_FILENAME}"

        file_store = get_default_file_store(db_session)
        file_io = file_store.read_file(file_path, mode="b")

        return Response(content=file_io.read(), media_type="image/jpeg")
    except Exception:
        raise HTTPException(
            status_code=404, detail="No logo file found for the teamspace"
        )
