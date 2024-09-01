"""
This file takes the happy path to adding a curator to a user group and then tests
the permissions of the curator manipulating credentials.
"""
import pytest
from requests.exceptions import HTTPError

from danswer.server.documents.models import DocumentSource
from tests.integration.common_utils.credential import CredentialManager
from tests.integration.common_utils.user import TestUser
from tests.integration.common_utils.user import UserManager
from tests.integration.common_utils.user_group import UserGroupManager


def test_credential_permissions(reset: None) -> None:
    # Creating an admin user (first user created is automatically an admin)
    admin_user: TestUser = UserManager.create(name="admin_user")

    # Creating a curator
    curator: TestUser = UserManager.create(name="curator")

    # Creating a user group
    user_group_1 = UserGroupManager.create(
        name="user_group_1",
        user_ids=[curator.id],
        cc_pair_ids=[],
        user_performing_action=admin_user,
    )
    UserGroupManager.wait_for_sync(
        user_groups_to_check=[user_group_1], user_performing_action=admin_user
    )
    # setting the user as a curator for the user group
    assert UserGroupManager.set_user_to_curator(
        test_user_group=user_group_1,
        user_to_set_as_curator=curator,
        user_performing_action=admin_user,
    )

    # Creating another user group that the user is not a curator of
    user_group_2 = UserGroupManager.create(
        name="user_group_2",
        user_ids=[curator.id],
        cc_pair_ids=[],
        user_performing_action=admin_user,
    )
    UserGroupManager.wait_for_sync(
        user_groups_to_check=[user_group_1], user_performing_action=admin_user
    )

    # END OF HAPPY PATH

    """
    Curators should not be able to:
    - Create a public credential
    - Create a credential for a user group they are not a curator of
    """
    with pytest.raises(HTTPError):
        CredentialManager.create(
            name="invalid_credential_1",
            source=DocumentSource.CONFLUENCE,
            groups=[user_group_1.id],
            curator_public=True,
            user_performing_action=curator,
        )

    with pytest.raises(HTTPError):
        CredentialManager.create(
            name="invalid_credential_2",
            source=DocumentSource.CONFLUENCE,
            groups=[user_group_1.id, user_group_2.id],
            curator_public=False,
            user_performing_action=curator,
        )

    """
    Curators should be able to:
    - Create a private credential for a user group they are a curator of
    """
    valid_credential = CredentialManager.create(
        name="valid_credential",
        source=DocumentSource.CONFLUENCE,
        groups=[user_group_1.id],
        curator_public=False,
        user_performing_action=curator,
    )
    assert valid_credential.id is not None

    # Verify the created credential
    assert CredentialManager.verify(valid_credential, user_performing_action=curator)

    # Verify that the credential can be found in the list of all credentials
    all_credentials = CredentialManager.get_all(user_performing_action=curator)
    assert any(cred.id == valid_credential.id for cred in all_credentials)

    # Test editing the credential
    valid_credential.name = "updated_valid_credential"
    assert CredentialManager.edit(valid_credential, user_performing_action=curator)

    # Verify the edit
    assert CredentialManager.verify(valid_credential, user_performing_action=curator)

    # Test deleting the credential
    assert CredentialManager.delete(valid_credential, user_performing_action=curator)

    # Verify the deletion
    all_credentials_after_delete = CredentialManager.get_all(
        user_performing_action=curator
    )
    assert all(cred.id != valid_credential.id for cred in all_credentials_after_delete)
