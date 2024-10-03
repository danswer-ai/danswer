import requests

from danswer.configs.app_configs import CONTROLPLANE_API_URL
from danswer.utils.logger import setup_logger
from ee.danswer.server.tenants.models import BillingInformation

logger = setup_logger()


def fetch_tenant_customer_id(tenant_id: str) -> str:
    response = requests.get(
        f"{CONTROLPLANE_API_URL}/tenant-customer-id?tenant_id={tenant_id}",
    )
    response.raise_for_status()
    return response.json().get("stripe_customer_id")


def fetch_billing_information(tenant_id: str) -> BillingInformation:
    logger.info("Fetching billing information")
    response = requests.get(
        f"{CONTROLPLANE_API_URL}/billing-information?tenant_id={tenant_id}",
    )
    logger.info("Billing information fetched", response.json())

    response.raise_for_status()
    return response.json()
