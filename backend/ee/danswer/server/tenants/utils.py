import requests

from danswer.configs.app_configs import CONTROLPLANE_API_URL
from danswer.utils.logger import setup_logger
from ee.danswer.server.tenants.models import BillingInformation

logger = setup_logger()


def fetch_tenant_stripe_information(tenant_id: str) -> dict:
    response = requests.get(
        f"{CONTROLPLANE_API_URL}/tenant-stripe-information?tenant_id={tenant_id}",
    )
    response.raise_for_status()
    return response.json()


def fetch_billing_information(tenant_id: str) -> BillingInformation:
    logger.info("Fetching billing information")
    response = requests.get(
        f"{CONTROLPLANE_API_URL}/billing-information?tenant_id={tenant_id}",
    )
    logger.info("Billing information fetched", response.json())

    response.raise_for_status()
    return response.json()
