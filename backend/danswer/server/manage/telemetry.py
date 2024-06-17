
from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.orm import Session

from danswer.auth.users import current_admin_user
from danswer.db.chat import get_empty_chat_messages_entries
from danswer.db.models import User
from danswer.db.models import ChatMessage
from danswer.db.models import ChatSession
from danswer.db.engine import get_session

router = APIRouter()

@router.post("/admin/generate-report")
async def generate_report(
    user: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> list[str] :
    messages = get_empty_chat_messages_entries(db_session)
    return [str(m.time_sent) for m in messages ]
