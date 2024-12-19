import csv
import tempfile
import uuid
import zipfile
from datetime import datetime
from datetime import timedelta
from datetime import timezone

from fastapi_users_db_sqlalchemy import UUID_ID
from sqlalchemy.orm import Session

from ee.onyx.db.usage_export import get_all_empty_chat_message_entries
from ee.onyx.db.usage_export import write_usage_report
from ee.onyx.server.reporting.usage_export_models import UsageReportMetadata
from ee.onyx.server.reporting.usage_export_models import UserSkeleton
from onyx.auth.schemas import UserStatus
from onyx.configs.constants import FileOrigin
from onyx.db.users import get_all_users
from onyx.file_store.constants import MAX_IN_MEMORY_SIZE
from onyx.file_store.file_store import FileStore
from onyx.file_store.file_store import get_default_file_store


def generate_chat_messages_report(
    db_session: Session,
    file_store: FileStore,
    report_id: str,
    period: tuple[datetime, datetime] | None,
) -> str:
    file_name = f"{report_id}_chat_sessions"

    if period is None:
        period = (
            datetime.fromtimestamp(0, tz=timezone.utc),
            datetime.now(tz=timezone.utc),
        )
    else:
        # time-picker sends a time which is at the beginning of the day
        # so we need to add one day to the end time to make it inclusive
        period = (
            period[0],
            period[1] + timedelta(days=1),
        )

    with tempfile.SpooledTemporaryFile(
        max_size=MAX_IN_MEMORY_SIZE, mode="w+"
    ) as temp_file:
        csvwriter = csv.writer(temp_file, delimiter=",")
        csvwriter.writerow(["session_id", "user_id", "flow_type", "time_sent"])
        for chat_message_skeleton_batch in get_all_empty_chat_message_entries(
            db_session, period
        ):
            for chat_message_skeleton in chat_message_skeleton_batch:
                csvwriter.writerow(
                    [
                        chat_message_skeleton.chat_session_id,
                        chat_message_skeleton.user_id,
                        chat_message_skeleton.flow_type,
                        chat_message_skeleton.time_sent.isoformat(),
                    ]
                )

        # after writing seek to begining of buffer
        temp_file.seek(0)
        file_store.save_file(
            file_name=file_name,
            content=temp_file,
            display_name=file_name,
            file_origin=FileOrigin.OTHER,
            file_type="text/csv",
        )

    return file_name


def generate_user_report(
    db_session: Session,
    file_store: FileStore,
    report_id: str,
) -> str:
    file_name = f"{report_id}_users"

    with tempfile.SpooledTemporaryFile(
        max_size=MAX_IN_MEMORY_SIZE, mode="w+"
    ) as temp_file:
        csvwriter = csv.writer(temp_file, delimiter=",")
        csvwriter.writerow(["user_id", "status"])

        users = get_all_users(db_session)
        for user in users:
            user_skeleton = UserSkeleton(
                user_id=str(user.id),
                status=UserStatus.LIVE if user.is_active else UserStatus.DEACTIVATED,
            )
            csvwriter.writerow([user_skeleton.user_id, user_skeleton.status])

        temp_file.seek(0)
        file_store.save_file(
            file_name=file_name,
            content=temp_file,
            display_name=file_name,
            file_origin=FileOrigin.OTHER,
            file_type="text/csv",
        )

    return file_name


def create_new_usage_report(
    db_session: Session,
    user_id: UUID_ID | None,  # None = auto-generated
    period: tuple[datetime, datetime] | None,
) -> UsageReportMetadata:
    report_id = str(uuid.uuid4())
    file_store = get_default_file_store(db_session)

    messages_filename = generate_chat_messages_report(
        db_session, file_store, report_id, period
    )
    users_filename = generate_user_report(db_session, file_store, report_id)

    with tempfile.SpooledTemporaryFile(max_size=MAX_IN_MEMORY_SIZE) as zip_buffer:
        with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED) as zip_file:
            # write messages
            chat_messages_tmpfile = file_store.read_file(
                messages_filename, mode="b", use_tempfile=True
            )
            zip_file.writestr(
                "chat_messages.csv",
                chat_messages_tmpfile.read(),
            )

            # write users
            users_tmpfile = file_store.read_file(
                users_filename, mode="b", use_tempfile=True
            )
            zip_file.writestr("users.csv", users_tmpfile.read())

        zip_buffer.seek(0)

        # store zip blob to file_store
        report_name = (
            f"{datetime.now(tz=timezone.utc).strftime('%Y-%m-%d')}"
            f"_{report_id}_usage_report.zip"
        )
        file_store.save_file(
            file_name=report_name,
            content=zip_buffer,
            display_name=report_name,
            file_origin=FileOrigin.GENERATED_REPORT,
            file_type="application/zip",
        )

    # add report after zip file is written
    new_report = write_usage_report(db_session, report_name, user_id, period)

    return UsageReportMetadata(
        report_name=new_report.report_name,
        requestor=(
            str(new_report.requestor_user_id) if new_report.requestor_user_id else None
        ),
        time_created=new_report.time_created,
        period_from=new_report.period_from,
        period_to=new_report.period_to,
    )
