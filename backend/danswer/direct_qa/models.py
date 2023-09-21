from pydantic import BaseModel


class LLMMetricsContainer(BaseModel):
    prompt_tokens: int
    response_tokens: int
