"""
This file takes the happy path to adding a curator to a user group and then tests
the permissions of the curator manipulating credentials.
"""
import pytest
from requests.exceptions import HTTPError

from enmedd.server.documents.models import DocumentSource
from tests.integration.common_utils.managers.credential import CredentialManager
from tests.integration.common_utils.managers.teamspace import TeamspaceManager
from tests.integration.common_utils.managers.user import DATestUser
from tests.integration.common_utils.managers.user import UserManager


def test_credential_permissions(reset: None) -> None:
    # Creating an admin user (first user created is automatically an admin)
    admin_user: DATestUser = UserManager.create(name="admin_user")

    # Creating a curator
    curator: DATestUser = UserManager.create(name="curator")

    # Creating a user group
    teamspace_1 = TeamspaceManager.create(
        name="teamspace_1",
        user_ids=[curator.id],
        cc_pair_ids=[],
        user_performing_action=admin_user,
    )
    TeamspaceManager.wait_for_sync(
        teamspaces_to_check=[teamspace_1], user_performing_action=admin_user
    )
    # setting the user as a curator for the user group
    TeamspaceManager.set_curator_status(
        test_teamspace=teamspace_1,
        user_to_set_as_curator=curator,
        user_performing_action=admin_user,
    )

    # Creating another user group that the user is not a curator of
    teamspace_2 = TeamspaceManager.create(
        name="teamspace_2",
        user_ids=[curator.id],
        cc_pair_ids=[],
        user_performing_action=admin_user,
    )
    TeamspaceManager.wait_for_sync(
        teamspaces_to_check=[teamspace_1], user_performing_action=admin_user
    )

    # END OF HAPPY PATH

    """Tests for things Curators should not be able to do"""

    # Curators should not be able to create a public credential
    with pytest.raises(HTTPError):
        CredentialManager.create(
            name="invalid_credential_1",
            source=DocumentSource.CONFLUENCE,
            groups=[teamspace_1.id],
            curator_public=True,
            user_performing_action=curator,
        )

    # Curators should not be able to create a credential for a user group they are not a curator of
    with pytest.raises(HTTPError):
        CredentialManager.create(
            name="invalid_credential_2",
            source=DocumentSource.CONFLUENCE,
            groups=[teamspace_1.id, teamspace_2.id],
            curator_public=False,
            user_performing_action=curator,
        )

    """Tests for things Curators should be able to do"""
    # Curators should be able to create a private credential for a user group they are a curator of
    valid_credential = CredentialManager.create(
        name="valid_credential",
        source=DocumentSource.CONFLUENCE,
        groups=[teamspace_1.id],
        curator_public=False,
        user_performing_action=curator,
    )

    # Verify the created credential
    CredentialManager.verify(
        credential=valid_credential,
        user_performing_action=curator,
    )

    # Test editing the credential
    valid_credential.name = "updated_valid_credential"
    CredentialManager.edit(valid_credential, user_performing_action=curator)

    # Verify the edit
    CredentialManager.verify(
        credential=valid_credential,
        user_performing_action=curator,
    )

    # Test deleting the credential
    CredentialManager.delete(valid_credential, user_performing_action=curator)

    # Verify the deletion
    CredentialManager.verify(
        credential=valid_credential,
        verify_deleted=True,
        user_performing_action=curator,
    )
