import os

import requests
from pydantic import BaseModel

from danswer.server.manage.llm.models import LLMProviderUpsertRequest
from tests.integration.common_utils.constants import API_SERVER_URL


class LLM(BaseModel):
    provider: str
    api_key: str
    default_model_name: str
    api_base: str | None = None
    api_version: str | None = None
    is_default: bool = True

    def create(self) -> int:
        llm_provider = LLMProviderUpsertRequest(
            name=self.provider,
            provider=self.provider,
            default_model_name=self.default_model_name,
            api_key=self.api_key,
            api_base=self.api_base,
            api_version=self.api_version,
            custom_config=None,
            fast_default_model_name=None,
            is_public=True,
            groups=None,
            display_model_names=None,
            model_names=None,
        )

        response = requests.put(
            f"{API_SERVER_URL}/admin/llm/provider",
            json=llm_provider.dict(),
        )
        response.raise_for_status()

        return response.json()["id"]

    @staticmethod
    def delete(provider_id: int) -> None:
        response = requests.delete(f"{API_SERVER_URL}/admin/llm/provider/{provider_id}")
        response.raise_for_status()


def seed_default_openai_provider() -> LLM:
    llm = LLM(
        provider="openai",
        default_model_name="gpt-4o-mini",
        api_key=os.environ["OPENAI_API_KEY"],
    )
    llm.create()
    return llm
