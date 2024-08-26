import requests

from tests.integration.common_utils.cc_pair import TestConnectorCredentialPair
from tests.integration.common_utils.connector import TestConnector
from tests.integration.common_utils.credential import TestCredential
from tests.integration.common_utils.user import TestUser


def test_admin_permissios(reset: None) -> None:
    admin_user = TestUser()
    admin_user.create(name="admin_user")
    admin_user.login()
    admin_user.check_me()
    assert admin_user.role == "admin"

    user = TestUser()
    user.create(name="basic_user")
    user.login()
    user.check_me()
    assert user.role == "basic"

    credential_1 = TestCredential()
    credential_1.create(user_performing_action=admin_user)
    assert credential_1.last_action_successful

    credential_2 = TestCredential()
    credential_2.create(user_performing_action=user)
    assert not credential_2.last_action_successful

    connector_1 = TestConnector()
    connector_1.create(user_performing_action=admin_user)
    assert connector_1.last_action_successful

    connector_2 = TestConnector()
    try:
        connector_2.create(user_performing_action=user)
        assert (
            False  # the above should fail because user does not have admin permissions
        )
    except requests.HTTPError as e:
        print(f"Failed to create connector {connector_2.id}")
        print(e)
    assert not connector_2.last_action_successful

    cc_pair_1 = TestConnectorCredentialPair()
    cc_pair_1.create(
        user_performing_action=admin_user,
        credential=credential_1,
        connector=connector_1,
    )
    assert cc_pair_1.last_action_successful

    cc_pair_2 = TestConnectorCredentialPair()
    cc_pair_2.create(
        user_performing_action=user,
        credential=credential_1,
        connector=connector_1,
    )
    assert not cc_pair_2.last_action_successful
