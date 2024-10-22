from typing import Optional

from fastapi import Depends
from fastapi import HTTPException
from sqlalchemy.orm import Session

from enmedd.db.engine import get_session
from enmedd.db.models import TeamspaceSettings
from enmedd.db.models import WorkspaceSettings
from enmedd.server.settings.models import Settings


def load_settings(
    db: Session = Depends(get_session), teamspace_id: Optional[int] = None
) -> Settings:
    if teamspace_id:
        settings_record = (
            db.query(TeamspaceSettings).filter_by(teamspace_id=teamspace_id).first()
        )
        if settings_record:
            return Settings(
                chat_page_enabled=settings_record.chat_page_enabled,
                search_page_enabled=settings_record.search_page_enabled,
                chat_history_enabled=settings_record.chat_history_enabled,
                default_page=settings_record.default_page,
                maximum_chat_retention_days=settings_record.maximum_chat_retention_days,
            )

    settings_record = db.query(WorkspaceSettings).first()
    if settings_record:
        return Settings(
            chat_page_enabled=settings_record.chat_page_enabled,
            search_page_enabled=settings_record.search_page_enabled,
            default_page=settings_record.default_page,
            maximum_chat_retention_days=settings_record.maximum_chat_retention_days,
        )

    return Settings()


def store_settings(
    settings: Settings,
    db: Session = Depends(get_session),
    teamspace_id: Optional[int] = None,
) -> None:
    if teamspace_id:
        settings_record = (
            db.query(TeamspaceSettings).filter_by(teamspace_id=teamspace_id).first()
        )
    else:
        settings_record = db.query(WorkspaceSettings).first()

    if settings_record:
        settings_record.chat_page_enabled = settings.chat_page_enabled
        settings_record.search_page_enabled = settings.search_page_enabled
        settings_record.chat_history_enabled = settings.chat_history_enabled
        settings_record.default_page = settings.default_page
        settings_record.maximum_chat_retention_days = (
            settings.maximum_chat_retention_days
        )
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
                chat_history_enabled=settings.chat_history_enabled,
                default_page=settings.default_page,
                maximum_chat_retention_days=settings.maximum_chat_retention_days,
                workspace_id=0,
            )
        )
        db.add(new_record)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to store settings.")
