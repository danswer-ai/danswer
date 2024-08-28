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


def test_curator_permissions(reset: None) -> None:
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
    assert UserManager.register_test_user(curator)
    assert UserManager.login_test_user(curator)

    # Creating a user group
    user_group_1 = UserGroupManager.build_test_user_group(
        name="user_group_1",
        user_ids=[],
        cc_pair_ids=[],
    )
    user_group_1.id = UserGroupManager.upsert_test_user_group(
        user_group_1, user_performing_action=admin_user
    )
    UserGroupManager.wait_for_user_groups_to_sync()
    assert UserGroupManager.set_curator(
        test_user_group=user_group_1,
        user_to_set_as_curator=curator,
        user_performing_action=admin_user,
    )

    # Creating a credential
    test_credential = CredentialManager.build_test_credential(
        source=DocumentSource.FILE, name="curator_test_credential"
    )
    assert CredentialManager.upsert_test_credential(
        test_credential, user_performing_action=curator
    )

    # Creating a connector
    test_connector = ConnectorManager.build_test_connector(
        name="curator_test_connector", source=DocumentSource.FILE
    )
    assert ConnectorManager.upsert_test_connector(
        test_connector, user_performing_action=curator
    )

    assert test_connector.id is not None
    assert test_credential.id is not None
    # Creating a CC pair
    test_cc_pair = CCPairManager.build_test_cc_pair(
        connector_id=test_connector.id,
        credential_id=test_credential.id,
        name="curator_test_cc_pair",
    )
    assert CCPairManager.upsert_test_cc_pair(
        test_cc_pair, user_performing_action=curator
    )

    # Verify CC pair exists
    user_groups = UserGroupManager.fetch_user_groups()
    cc_pair_exists = any(
        cc_pair.id == test_cc_pair.id
        for user_group in user_groups
        for cc_pair in user_group.cc_pairs
    )
    assert cc_pair_exists, "CC pair was not found in any user group"
