from pydantic import BaseModel


class CheckoutSessionCreationRequest(BaseModel):
    quantity: int


class CreateTenantRequest(BaseModel):
    tenant_id: str
    initial_admin_email: str


class BillingInformation(BaseModel):
    seats: int
    subscriptionStatus: str
    billingStart: str
    billingEnd: str
    paymentMethodEnabled: bool


class CheckoutSessionCreationResponse(BaseModel):
    id: str
