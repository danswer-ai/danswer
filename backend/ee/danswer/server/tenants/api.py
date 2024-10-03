import stripe
from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from danswer.auth.users import control_plane_dep
from danswer.auth.users import current_admin_user
from danswer.auth.users import User
from danswer.configs.app_configs import MULTI_TENANT
from danswer.configs.app_configs import WEB_DOMAIN
from danswer.db.engine import get_session_with_tenant
from danswer.setup import setup_danswer
from danswer.utils.logger import setup_logger
from ee.danswer.configs.app_configs import STRIPE_PRICE_ID
from ee.danswer.configs.app_configs import STRIPE_SECRET_KEY
from ee.danswer.server.tenants.models import BillingInformation
from ee.danswer.server.tenants.models import CheckoutSessionCreationRequest
from ee.danswer.server.tenants.models import CheckoutSessionCreationResponse
from ee.danswer.server.tenants.models import CreateTenantRequest
from ee.danswer.server.tenants.provisioning import add_users_to_tenant
from ee.danswer.server.tenants.provisioning import ensure_schema_exists
from ee.danswer.server.tenants.provisioning import run_alembic_migrations
from ee.danswer.server.tenants.provisioning import user_owns_a_tenant
from ee.danswer.server.tenants.utils import fetch_billing_information
from ee.danswer.server.tenants.utils import fetch_tenant_customer_id
from shared_configs.configs import current_tenant_id

logger = setup_logger()
router = APIRouter(prefix="/tenants")
stripe.api_key = STRIPE_SECRET_KEY


@router.post("/create")
def create_tenant(
    create_tenant_request: CreateTenantRequest, _: None = Depends(control_plane_dep)
) -> dict[str, str]:
    tenant_id = create_tenant_request.tenant_id
    email = create_tenant_request.initial_admin_email
    token = None

    if user_owns_a_tenant(email):
        raise HTTPException(
            status_code=409, detail="User already belongs to an organization"
        )

    try:
        if not MULTI_TENANT:
            raise HTTPException(status_code=403, detail="Multi-tenancy is not enabled")

        if not ensure_schema_exists(tenant_id):
            logger.info(f"Created schema for tenant {tenant_id}")
        else:
            logger.info(f"Schema already exists for tenant {tenant_id}")

        run_alembic_migrations(tenant_id)
        token = current_tenant_id.set(tenant_id)
        print("getting session", tenant_id)
        with get_session_with_tenant(tenant_id) as db_session:
            setup_danswer(db_session)

        add_users_to_tenant([email], tenant_id)

        return {
            "status": "success",
            "message": f"Tenant {tenant_id} created successfully",
        }
    except Exception as e:
        logger.exception(f"Failed to create tenant {tenant_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to create tenant: {str(e)}"
        )
    finally:
        if token is not None:
            current_tenant_id.reset(token)


@router.post("/create-checkout-session")
async def create_checkout_session(
    checkout_session_creation_request: CheckoutSessionCreationRequest,
    _: User = Depends(current_admin_user),
) -> CheckoutSessionCreationResponse:
    try:
        tenant_id = current_tenant_id.get()
        stripe_customer_id = fetch_tenant_customer_id(tenant_id)

        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price": STRIPE_PRICE_ID,
                    "quantity": checkout_session_creation_request.quantity,
                }
            ],
            mode="subscription",
            success_url=f"{WEB_DOMAIN}/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{WEB_DOMAIN}/cancel",
            metadata={"tenant_id": str(tenant_id)},
            customer=stripe_customer_id,
        )

        return CheckoutSessionCreationResponse(id=checkout_session.id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/billing-information", response_model=BillingInformation)
async def billing_information(
    _: User = Depends(current_admin_user),
) -> BillingInformation:
    logger.info("Fetching billing information")
    return fetch_billing_information(current_tenant_id.get())


@router.post("/create-customer-portal-session")
async def create_customer_portal_session(_: User = Depends(current_admin_user)) -> dict:
    try:
        # Fetch tenant_id and the current tenant's information
        tenant_id = current_tenant_id.get()
        stripe_customer_id = fetch_tenant_customer_id(tenant_id)

        portal_session = stripe.billing_portal.Session.create(
            customer=stripe_customer_id,
            return_url=f"{WEB_DOMAIN}/dashboard",
        )

        return {"url": portal_session.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
