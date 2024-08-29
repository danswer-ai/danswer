"""

"""
from danswer.db.models import UserRole
from danswer.server.documents.models import DocumentSource
from tests.integration.common_utils.credential import CredentialManager
from tests.integration.common_utils.user import TestUser
from tests.integration.common_utils.user import UserManager
from tests.integration.common_utils.user_groups import UserGroupManager


def test_curator_credential_permissions(reset: None) -> None:
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
    user_group_1.id = UserGroupManager.send_user_group(
        user_group_1, user_performing_action=admin_user
    ).json()["id"]
    UserGroupManager.wait_for_user_groups_to_sync(admin_user)
    # setting the user as a curator for the user group
    assert UserGroupManager.set_curator(
        test_user_group=user_group_1,
        user_to_set_as_curator=curator,
        user_performing_action=admin_user,
    )

    # Creating another user group that the user is not a curator of
    user_group_2 = UserGroupManager.build_test_user_group(
        name="user_group_2",
        user_ids=[curator.id],
        cc_pair_ids=[],
    )
    user_group_2.id = UserGroupManager.send_user_group(
        user_group_2, user_performing_action=admin_user
    ).json()["id"]
    UserGroupManager.wait_for_user_groups_to_sync(admin_user)
    assert user_group_2.id is not None and user_group_1.id is not None

    """
    Curators should not be able to:
    - Create a public credential
    - Create a credential for a user group they are not a curator of
    """
    invalid_credential_1 = CredentialManager.build_test_credential(
        name="invalid_credential_1",
        # Using the default document source wont properly test this
        # because FILE is not checked by the backend
        source=DocumentSource.CONFLUENCE,
        groups=[user_group_1.id],
        curator_public=True,
    )
    assert not CredentialManager.send_credential(
        invalid_credential_1, user_performing_action=curator
    ).ok
    invalid_credential_2 = CredentialManager.build_test_credential(
        name="invalid_credential_2",
        # Using the default document source wont properly test this
        # because FILE is not checked by the backend
        source=DocumentSource.CONFLUENCE,
        groups=[user_group_1.id, user_group_2.id],
        curator_public=False,
    )
    assert not CredentialManager.send_credential(
        invalid_credential_2, user_performing_action=curator
    ).ok

    valid_credential = CredentialManager.build_test_credential(
        name="valid_credential",
        # Using the default document source wont properly test this
        # because FILE is not checked by the backend
        source=DocumentSource.CONFLUENCE,
        groups=[user_group_1.id],
        curator_public=False,
    )
    valid_credential.id = CredentialManager.send_credential(
        valid_credential, user_performing_action=curator
    ).json()["id"]
