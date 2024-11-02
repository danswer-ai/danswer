from collections.abc import Generator

import pytest
from sqlalchemy.orm import Session

from danswer.db.engine import get_session_context_manager
from danswer.db.search_settings import get_current_search_settings
from tests.integration.common_utils.managers.user import UserManager
from tests.integration.common_utils.reset import reset_all
from tests.integration.common_utils.reset import reset_all_multitenant
from tests.integration.common_utils.test_models import DATestUser
from tests.integration.common_utils.vespa import vespa_fixture
from tests.load_env_vars import load_env_vars

# Load environment variables at the module level
load_env_vars()


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    with get_session_context_manager() as session:
        yield session


@pytest.fixture
def vespa_client(db_session: Session) -> vespa_fixture:
    search_settings = get_current_search_settings(db_session)
    return vespa_fixture(index_name=search_settings.index_name)


@pytest.fixture
def reset() -> None:
    reset_all()


@pytest.fixture
def new_admin_user(reset: None) -> DATestUser | None:
    try:
        return UserManager.create(name="admin_user")
    except Exception:
        return None


@pytest.fixture
def reset_multitenant() -> None:
    reset_all_multitenant()
