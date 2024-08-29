"""
This file tests the ability of different user types to set the role of other users.
"""
from danswer.db.models import UserRole
from tests.integration.common_utils.user import TestUser
from tests.integration.common_utils.user import UserManager
from tests.integration.common_utils.user_groups import UserGroupManager


def test_user_role_setting_permissions(reset: None) -> None:
    # Creating an admin user (first user created is automatically an admin)
    admin_user: TestUser = UserManager.build_test_user(
        name="admin_user",
        desired_role=UserRole.ADMIN,
    )
    admin_user.id = UserManager.register_test_user(admin_user)
    assert UserManager.login_test_user(admin_user)

    # Creating a basic user
    basic_user: TestUser = UserManager.build_test_user(
        name="basic_user",
        desired_role=UserRole.BASIC,
    )
    basic_user.id = UserManager.register_test_user(basic_user)
    assert UserManager.login_test_user(basic_user)

    # Creating an invalid curator
    curator: TestUser = UserManager.build_test_user(
        name="curator",
        desired_role=UserRole.CURATOR,
    )
    curator.id = UserManager.register_test_user(curator)
    assert UserManager.login_test_user(curator)

    # Creating a curator without adding to a group should not work
    assert not UserManager.set_role(user=curator, user_to_perform_action=admin_user)

    global_curator: TestUser = UserManager.build_test_user(
        name="global_curator",
        desired_role=UserRole.GLOBAL_CURATOR,
    )
    global_curator.id = UserManager.register_test_user(global_curator)
    assert UserManager.login_test_user(global_curator)

    # Setting the role of a global curator should not work for a basic user
    assert not UserManager.set_role(
        user=global_curator, user_to_perform_action=basic_user
    )
    assert UserManager.set_role(user=global_curator, user_to_perform_action=admin_user)
    assert UserManager.verify_role(global_curator)

    # Setting the role of a global curator should not work for an invalid curator
    global_curator.desired_role = UserRole.BASIC
    assert not UserManager.set_role(
        user=global_curator, user_to_perform_action=global_curator
    )
    assert not UserManager.verify_role(global_curator)
    global_curator.desired_role = UserRole.GLOBAL_CURATOR

    # Creating a user group
    user_group_1 = UserGroupManager.build_test_user_group(
        name="user_group_1",
        user_ids=[],
        cc_pair_ids=[],
    )
    response = UserGroupManager.send_user_group(
        user_group_1,
        user_performing_action=admin_user,
    )
    response.raise_for_status()
    user_group_1.id = int(response.json()["id"])
    UserGroupManager.wait_for_user_groups_to_sync(admin_user)
    # This should fail because the curator is not in the user group
    assert not UserGroupManager.set_curator(
        test_user_group=user_group_1,
        user_to_set_as_curator=curator,
        user_performing_action=admin_user,
    ).ok

    # Adding the curator to the user group
    user_group_1.user_group_creation_request.user_ids = [curator.id]
    response = UserGroupManager.edit_user_group(
        user_group_1, user_performing_action=admin_user
    )
    response.raise_for_status()
    user_group_1.id = int(response.json()["id"])
    UserGroupManager.wait_for_user_groups_to_sync(admin_user)
    # This should work because the curator is in the user group
    assert UserGroupManager.set_curator(
        test_user_group=user_group_1,
        user_to_set_as_curator=curator,
        user_performing_action=admin_user,
    ).ok
