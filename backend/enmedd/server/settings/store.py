from typing import cast
from typing import Optional

from fastapi import Depends
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from enmedd.auth.users import current_workspace_admin_user
from enmedd.db.models import TeamspaceSettings
from enmedd.db.models import User
from enmedd.db.models import WorkspaceSettings
from enmedd.key_value_store.factory import get_kv_store
from enmedd.key_value_store.interface import KvKeyNotFoundError
from enmedd.server.settings.models import Settings
from enmedd.server.settings.models import WorkspaceThemes
from enmedd.utils.logger import setup_logger


_WORKSPACE_THEMES = "workspace_themes"
logger = setup_logger()


def load_workspace_themes() -> WorkspaceThemes:
    dynamic_config_store = get_kv_store()
    try:
        workspace_themes = WorkspaceThemes(
            **cast(dict, dynamic_config_store.load(_WORKSPACE_THEMES))
        )
    except KvKeyNotFoundError:
        workspace_themes = WorkspaceThemes()
        dynamic_config_store.store(_WORKSPACE_THEMES, workspace_themes.model_dump())

    return workspace_themes


def store_workspace_themes(
    workspace_themes: WorkspaceThemes,
    _: User | None = Depends(current_workspace_admin_user),
) -> None:
    logger.info("Updating Workspace Themes")
    get_kv_store().store(_WORKSPACE_THEMES, workspace_themes.model_dump(by_alias=True))


def load_settings(
    db_session: Session,
    workspace_id: Optional[int] = None,
    teamspace_id: Optional[int] = None,
) -> Settings:
    if teamspace_id:
        settings_record = (
            db_session.query(TeamspaceSettings)
            .filter_by(teamspace_id=teamspace_id)
            .first()
        )
        if settings_record:
            return Settings(
                chat_page_enabled=settings_record.chat_page_enabled,
                search_page_enabled=settings_record.search_page_enabled,
                chat_history_enabled=settings_record.chat_history_enabled,
                default_page=settings_record.default_page,
                maximum_chat_retention_days=settings_record.maximum_chat_retention_days,
            )

    settings_record = (
        db_session.query(WorkspaceSettings).filter_by(workspace_id=workspace_id).first()
    )
    if settings_record:
        return Settings(
            chat_page_enabled=settings_record.chat_page_enabled,
            search_page_enabled=settings_record.search_page_enabled,
            default_page=settings_record.default_page,
            maximum_chat_retention_days=settings_record.maximum_chat_retention_days,
            num_indexing_workers=settings_record.num_indexing_workers,
            vespa_searcher_threads=settings_record.vespa_searcher_threads,
            smtp_port=settings_record.smtp_port,
            smtp_server=settings_record.smtp_server,
            smtp_username=settings_record.smtp_username,
            smtp_password=settings_record.smtp_password,
        )

    return Settings()


def store_settings(
    settings: Settings,
    db_session: Session,
    workspace_id: Optional[int] = None,
    teamspace_id: Optional[int] = None,
    schema_name: Optional[str] = None,
) -> None:
    if schema_name:
        db_session.execute(text(f"SET search_path TO {schema_name}"))

    if teamspace_id:
        settings_record = (
            db_session.query(TeamspaceSettings)
            .filter_by(teamspace_id=teamspace_id)
            .first()
        )
    else:
        settings_record = (
            db_session.query(WorkspaceSettings)
            .filter_by(workspace_id=workspace_id)
            .first()
        )
    if settings_record:
        settings_record.chat_page_enabled = settings.chat_page_enabled
        settings_record.search_page_enabled = settings.search_page_enabled
        settings_record.chat_history_enabled = settings.chat_history_enabled
        settings_record.default_page = settings.default_page
        settings_record.maximum_chat_retention_days = (
            settings.maximum_chat_retention_days
        )
        settings_record.num_indexing_workers = settings.num_indexing_workers
        settings_record.vespa_searcher_threads = settings.vespa_searcher_threads
    else:
        new_record = (
            TeamspaceSettings(
                chat_page_enabled=settings.chat_page_enabled,
                search_page_enabled=settings.search_page_enabled,
                chat_history_enabled=settings.chat_history_enabled,
                default_page=settings.default_page,
                maximum_chat_retention_days=settings.maximum_chat_retention_days,
                teamspace_id=teamspace_id,
            )
            if teamspace_id
            else WorkspaceSettings(
                chat_page_enabled=settings.chat_page_enabled,
                search_page_enabled=settings.search_page_enabled,
                default_page=settings.default_page,
                maximum_chat_retention_days=settings.maximum_chat_retention_days,
                workspace_id=workspace_id,
                num_indexing_workers=settings.num_indexing_workers,
                vespa_searcher_threads=settings.vespa_searcher_threads,
            )
        )
        db_session.add(new_record)

    try:
        db_session.commit()
    except Exception:
        db_session.rollback()
        raise HTTPException(status_code=500, detail="Failed to store settings.")
    finally:
        if schema_name:
            db_session.execute(text("SET search_path TO public"))
