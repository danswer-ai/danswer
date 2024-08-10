from pydantic import BaseModel

from danswer.configs.chat_configs import NUM_POSTPROCESSED_RESULTS


class RerankingDetails(BaseModel):
    model_name: str
    api_key: str | None

    # Set to 0 to disable reranking explicitly
    num_rerank: int | None = NUM_POSTPROCESSED_RESULTS


class SavedRerankingModelDetail(RerankingDetails):
    # For faster flows where the results should start immediately
    # this more time intensive step can be skipped
    disable_for_streaming: bool

    def to_reranking_model_detail(self) -> RerankingDetails:
        return RerankingDetails(model_name=self.model_name, api_key=self.api_key)
