"""
This file takes the happy path to adding a curator to a user group and then tests
the permissions of the curator manipulating connector-credential pairs.
"""
import pytest
from requests.exceptions import HTTPError

from danswer.server.documents.models import DocumentSource
from tests.integration.common_utils.cc_pair import CCPairManager
from tests.integration.common_utils.connector import ConnectorManager
from tests.integration.common_utils.credential import CredentialManager
from tests.integration.common_utils.user import TestUser
from tests.integration.common_utils.user import UserManager
from tests.integration.common_utils.user_group import UserGroupManager


def test_cc_pair_permissions(reset: None) -> None:
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
    UserGroupManager.wait_for_user_groups_to_sync(admin_user)
    # setting the user as a curator for the user group
    assert UserGroupManager.set_curator(
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
    UserGroupManager.wait_for_user_groups_to_sync(admin_user)

    # Create a connector and credential for testing
    connector = ConnectorManager.create(
        name="test_connector",
        source=DocumentSource.CONFLUENCE,
        groups=[user_group_1.id],
        is_public=False,
        user_performing_action=admin_user,
    )
    credential = CredentialManager.create(
        name="test_credential",
        source=DocumentSource.CONFLUENCE,
        groups=[user_group_1.id],
        curator_public=False,
        user_performing_action=admin_user,
    )

    # END OF HAPPY PATH

    """
    Curators should not be able to:
    - Create a public cc pair
    - Create a cc pair for a user group they are not a curator of
    """
    with pytest.raises(HTTPError):
        CCPairManager.create(
            connector_id=connector.id,
            credential_id=credential.id,
            name="invalid_cc_pair_1",
            groups=[user_group_1.id],
            is_public=True,
            user_performing_action=curator,
        )

    with pytest.raises(HTTPError):
        CCPairManager.create(
            connector_id=connector.id,
            credential_id=credential.id,
            name="invalid_cc_pair_2",
            groups=[user_group_1.id, user_group_2.id],
            is_public=False,
            user_performing_action=curator,
        )

    """
    Curators should be able to:
    - Create a private cc pair for a user group they are a curator of
    """
    valid_cc_pair = CCPairManager.create(
        connector_id=connector.id,
        credential_id=credential.id,
        name="valid_cc_pair",
        groups=[user_group_1.id],
        is_public=False,
        user_performing_action=curator,
    )
    assert valid_cc_pair.id is not None

    # Verify the created cc pair
    assert CCPairManager.verify_cc_pair(valid_cc_pair, user_performing_action=curator)

    # Verify that the cc pair can be found in the list of all cc pairs
    all_cc_pairs = CCPairManager.get_all_cc_pairs(user_performing_action=curator)
    assert any(cc_pair.cc_pair_id == valid_cc_pair.id for cc_pair in all_cc_pairs)

    # Test pausing the cc pair
    assert CCPairManager.pause_cc_pair(valid_cc_pair, user_performing_action=curator)

    # Test deleting the cc pair
    assert CCPairManager.delete_cc_pair(valid_cc_pair, user_performing_action=curator)
    CCPairManager.wait_for_cc_pairs_deletion_complete(user_performing_action=curator)
    # Verify the deletion
    all_cc_pairs_after_delete = CCPairManager.get_all_cc_pairs(
        user_performing_action=curator
    )
    assert not any(
        cc_pair.cc_pair_id == valid_cc_pair.id for cc_pair in all_cc_pairs_after_delete
    )
