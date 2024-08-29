"""
This test tests the happy path for curator permissions
"""
from danswer.db.models import UserRole
from danswer.server.documents.models import DocumentSource
from tests.integration.common_utils.cc_pair import CCPairManager
from tests.integration.common_utils.connector import ConnectorManager
from tests.integration.common_utils.credential import CredentialManager
from tests.integration.common_utils.user import TestUser
from tests.integration.common_utils.user import UserManager
from tests.integration.common_utils.user_groups import UserGroupManager


def test_whole_curator_flow(reset: None) -> None:
    # Creating an admin user (first user created is automatically an admin)
    admin_user: TestUser = UserManager.build_test_user(
        name="admin_user",
        desired_role=UserRole.ADMIN,
    )
    admin_user.id = UserManager.register_test_user(admin_user)
    assert UserManager.login_test_user(admin_user)

    # Creating a curator
    curator: TestUser = UserManager.build_test_user(
        name="curator",
        desired_role=UserRole.CURATOR,
    )
    curator.id = UserManager.register_test_user(curator)
    assert UserManager.login_test_user(curator)

    # Creating a user group
    user_group_1 = UserGroupManager.build_test_user_group(
        name="user_group_1",
        user_ids=[curator.id],
        cc_pair_ids=[],
    )
    response = UserGroupManager.send_user_group(
        user_group_1, user_performing_action=admin_user
    )
    response.raise_for_status()
    user_group_1.id = int(response.json()["id"])
    UserGroupManager.wait_for_user_groups_to_sync(admin_user)
    # Making curator a curator of user_group_1
    assert UserGroupManager.set_curator(
        test_user_group=user_group_1,
        user_to_set_as_curator=curator,
        user_performing_action=admin_user,
    ).ok

    # Creating a credential as curator
    test_credential = CredentialManager.build_test_credential(
        source=DocumentSource.FILE,
        name="curator_test_credential",
        curator_public=False,
        groups=[user_group_1.id],
    )
    test_credential.id = CredentialManager.send_credential(
        test_credential, user_performing_action=curator
    ).json()["id"]

    # Creating a connector as curator
    test_connector = ConnectorManager.build_test_connector(
        name="curator_test_connector",
        source=DocumentSource.FILE,
        groups=[user_group_1.id],
        is_public=False,
    )
    test_connector.id = ConnectorManager.send_connector(
        test_connector, user_performing_action=curator
    ).json()["id"]

    assert test_connector.id is not None
    assert test_credential.id is not None
    # Creating a CC pair as curator
    test_cc_pair = CCPairManager.build_test_cc_pair(
        connector_id=test_connector.id,
        credential_id=test_credential.id,
        name="curator_test_cc_pair",
        groups=[user_group_1.id],
        is_public=False,
    )
    test_cc_pair.id = CCPairManager.send_cc_pair(
        test_cc_pair, user_performing_action=curator
    ).json()["data"]

    assert CCPairManager.verify_cc_pairs(
        [test_cc_pair], user_performing_action=admin_user
    )
