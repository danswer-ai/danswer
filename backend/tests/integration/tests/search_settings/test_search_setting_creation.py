"""
This file tests search settings creation and upgrades.
"""
from danswer.db.models import IndexModelStatus
from tests.integration.common_utils.managers.search_settings import (
    SearchSettingsManager,
)
from tests.integration.common_utils.managers.user import UserManager
from tests.integration.common_utils.test_models import TestUser


def test_creating_and_upgrading_search_settings(reset: None) -> None:
    # Create an admin user
    admin_user: TestUser = UserManager.create(name="admin_user")

    # Create initial search settings
    initial_settings = SearchSettingsManager.create(
        model_name="test-model-1",
        model_dim=768,
        user_performing_action=admin_user,
    )

    # Wait for the initial settings to be applied
    SearchSettingsManager.wait_for_sync(user_performing_action=admin_user)

    # Verify the initial settings
    SearchSettingsManager.verify(initial_settings, user_performing_action=admin_user)

    # Create new search settings (upgrade)
    new_settings = SearchSettingsManager.create(
        model_name="test-model-2",
        model_dim=1024,
        user_performing_action=admin_user,
    )

    # Wait for the new settings to be applied
    SearchSettingsManager.wait_for_sync(user_performing_action=admin_user)

    # Verify the new settings
    SearchSettingsManager.verify(new_settings, user_performing_action=admin_user)

    # Ensure the old settings are no longer current
    current_settings = SearchSettingsManager.get_current(
        user_performing_action=admin_user
    )
    assert current_settings.id != initial_settings.id
    assert current_settings.id == new_settings.id

    # Verify all search settings are present
    all_settings = SearchSettingsManager.get_all(user_performing_action=admin_user)
    assert len(all_settings) == 2
    assert all(setting.status == IndexModelStatus.PRESENT for setting in all_settings)
