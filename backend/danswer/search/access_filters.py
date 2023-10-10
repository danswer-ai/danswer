from collections.abc import Callable
from typing import cast

from sqlalchemy.orm import Session

from danswer.configs.constants import ACCESS_CONTROL_LIST
from danswer.datastores.interfaces import IndexFilter
from danswer.db.models import User
from danswer.utils.variable_functionality import fetch_versioned_implementation


def build_access_filters_for_user(
    user: User | None, session: Session
) -> list[IndexFilter]:
    get_acl_for_user = cast(
        Callable[[User | None, Session], set[str]],
        fetch_versioned_implementation(
            module="danswer.access.access", attribute="get_acl_for_user"
        ),
    )
    user_acl = get_acl_for_user(user, session)
    return [{ACCESS_CONTROL_LIST: list(user_acl)}]
