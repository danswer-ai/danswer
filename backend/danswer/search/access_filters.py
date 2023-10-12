from sqlalchemy.orm import Session

from danswer.access.access import get_acl_for_user
from danswer.configs.constants import ACCESS_CONTROL_LIST
from danswer.datastores.interfaces import IndexFilter
from danswer.db.models import User


def build_access_filters_for_user(
    user: User | None, session: Session
) -> list[IndexFilter]:
    user_acl = get_acl_for_user(user, session)
    return [{ACCESS_CONTROL_LIST: list(user_acl)}]
