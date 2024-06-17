import csv
import io
import uuid

from fastapi import APIRouter
from fastapi import Depends
from sqlalchemy.orm import Session

from danswer.auth.users import current_admin_user
from danswer.configs.constants import FileOrigin
from danswer.db.chat import get_empty_chat_messages_entries
from danswer.db.engine import get_session
from danswer.db.models import User
from danswer.file_store.file_store import get_default_file_store

router = APIRouter()


@router.post("/admin/generate-report")
async def generate_report(
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> list[str]:
    report_id = str(uuid.uuid4())
    messages = get_empty_chat_messages_entries(db_session)
    file_store = get_default_file_store(db_session)

    # write to memory buffer and store using pg_file_store
    with io.StringIO() as csvbuf:
        csvwriter = csv.writer(csvbuf, delimiter=",")
        csvwriter.writerow(["message_id", "chat_session_id", "time_sent"])
        for m in messages:
            csvwriter.writerow([m.message_id, m.chat_session_id, m.time_sent])

        # after writing seek to begining of buffer
        csvbuf.seek(0)
        file_store.save_file(
            file_name=f"{report_id}_chat_messages",
            content=csvbuf,
            display_name=f"{report_id}_chat_messages",
            file_origin=FileOrigin.OTHER,
            file_type="text/csv",
        )

    return [str(m.time_sent) for m in messages]
