from tests.integration.common_utils.managers.tenant import TenantManager


def test_tenant_creation(reset_multitenant: None) -> None:
    TenantManager.create("tenant_dev", "test@test.com")
