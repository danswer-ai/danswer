from pydantic import BaseModel


class CreateTenantRequest(BaseModel):
    tenant_id: str
    admin_email: str
