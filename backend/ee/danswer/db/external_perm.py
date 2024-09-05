from collections.abc import Sequence

from sqlalchemy import delete
from sqlalchemy import select
from sqlalchemy.orm import Session

from danswer.configs.constants import DocumentSource
from danswer.db.models import EmailToExternalUserCache
from danswer.db.models import ExternalPermission
from ee.danswer.background.models import ExternalUserDefinition
from ee.danswer.background.models import GroupDefinition


def fetch_external_user_cache(
    source_type: DocumentSource, db_session: Session
) -> Sequence[EmailToExternalUserCache]:
    return db_session.scalars(
        select(EmailToExternalUserCache).where(
            EmailToExternalUserCache.source_type == source_type
        )
    ).all()


def clear_external_permission_for_source__no_commit(
    db_session: Session, source_type: DocumentSource
) -> None:
    delete_statement = delete(ExternalPermission).where(
        ExternalPermission.source_type == source_type
    )
    db_session.execute(delete_statement)


def create_external_permissions__no_commit(
    db_session: Session, group_defs: list[GroupDefinition]
) -> None:
    for group_def in group_defs:
        for email in group_def.user_emails:
            new_external_permission = ExternalPermission(
                user_email=email,
                external_permission_group=group_def.external_id,
                source_type=group_def.source,
            )
            db_session.add(new_external_permission)


def upsert_external_user_cache(
    db_session: Session,
    user_caches: list[ExternalUserDefinition],
) -> None:
    # Does not handle updating if email changes
    for user_cache in user_caches:
        new_user_cache = EmailToExternalUserCache(
            external_user_id=user_cache.external_id,
            user_email=user_cache.user_email,
            source_type=user_cache.source,
        )
        db_session.add(new_user_cache)

    db_session.commit()


def fetch_ext_groups_for_user(
    db_session: Session,
    user_email: str,
) -> Sequence[ExternalPermission]:
    return db_session.scalars(
        select(ExternalPermission).where(ExternalPermission.user_email == user_email)
    ).all()
