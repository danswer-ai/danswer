from pydantic import BaseModel


class CheckoutSessionCreationRequest(BaseModel):
    quantity: int


class CreateTenantRequest(BaseModel):
    tenant_id: str
    initial_admin_email: str


class BillingInformation(BaseModel):
    seats: int
    subscription_status: str
    billing_start: str
    billing_end: str
    payment_method_enabled: bool


class CheckoutSessionCreationResponse(BaseModel):
    id: str
