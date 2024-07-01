from collections.abc import Callable

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from sqlalchemy.orm import Session

from danswer.auth.users import current_admin_user
from danswer.auth.users import current_user
from danswer.db.engine import get_session
from danswer.db.llm import fetch_existing_embedding_providers
from danswer.db.llm import fetch_existing_llm_providers
from danswer.db.llm import remove_embedding_provider
from danswer.db.llm import remove_llm_provider
from danswer.db.llm import update_default_provider
from danswer.db.llm import upsert_cloud_embedding_provider
from danswer.db.llm import upsert_llm_provider
from danswer.db.models import User
from danswer.llm.factory import Embedding
from danswer.llm.factory import get_default_llms
from danswer.llm.factory import get_embedding
from danswer.llm.factory import CloudEmbedding
from danswer.llm.factory import get_default_llm
from danswer.llm.factory import get_llm
from danswer.llm.llm_provider_options import fetch_available_well_known_llms
from danswer.llm.llm_provider_options import WellKnownLLMProviderDescriptor
from danswer.llm.utils import test_llm
from danswer.server.manage.llm.models import CloudEmbeddingProviderCreate
from danswer.server.manage.llm.models import FullCloudEmbeddingProvider
from danswer.server.manage.llm.models import FullLLMProvider
from danswer.server.manage.llm.models import LLMProviderDescriptor
from danswer.server.manage.llm.models import LLMProviderUpsertRequest
from danswer.server.manage.llm.models import TestEmbeddingRequest
from danswer.server.manage.llm.models import TestLLMRequest
from danswer.utils.logger import setup_logger
from danswer.utils.threadpool_concurrency import run_functions_tuples_in_parallel

logger = setup_logger()


admin_router = APIRouter(prefix="/admin/llm")
basic_router = APIRouter(prefix="/llm")


@admin_router.post("/test-embedding")
def test_embedding_configuration(
    test_llm_request: TestEmbeddingRequest,
    _: User | None = Depends(current_admin_user),
) -> None:
    try:
        embedding = CloudEmbedding.create(
            api_key=test_llm_request.api_key, provider=test_llm_request.provider
        )
        result = embedding.embed("Test embedding")
        return {"success": True, "embedding_length": len(result)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(
            f"An error occurred while testing embedding: {str(e)}", exc_info=True
        )
        raise HTTPException(
            status_code=500, detail=f"An unexpected error occurred- {e}"
        )


@admin_router.post("/test")
def test_llm_configuration(
    test_llm_request: TestLLMRequest,
    _: User | None = Depends(current_admin_user),
) -> None:
    llm = get_llm(
        provider=test_llm_request.provider,
        model=test_llm_request.default_model_name,
        api_key=test_llm_request.api_key,
        api_base=test_llm_request.api_base,
        api_version=test_llm_request.api_version,
        custom_config=test_llm_request.custom_config,
    )
    functions_with_args: list[tuple[Callable, tuple]] = [(test_llm, (llm,))]

    if (
        test_llm_request.fast_default_model_name
        and test_llm_request.fast_default_model_name
        != test_llm_request.default_model_name
    ):
        fast_llm = get_llm(
            provider=test_llm_request.provider,
            model=test_llm_request.fast_default_model_name,
            api_key=test_llm_request.api_key,
            api_base=test_llm_request.api_base,
            api_version=test_llm_request.api_version,
            custom_config=test_llm_request.custom_config,
        )
        functions_with_args.append((test_llm, (fast_llm,)))

    parallel_results = run_functions_tuples_in_parallel(
        functions_with_args, allow_failures=False
    )
    error = parallel_results[0] or (
        parallel_results[1] if len(parallel_results) > 1 else None
    )

    if error:
        raise HTTPException(status_code=400, detail=error)


@admin_router.post("/test/default")
def test_default_provider(
    _: User | None = Depends(current_admin_user),
) -> None:
    try:
        llm, fast_llm = get_default_llms()
    except ValueError:
        logger.exception("Failed to fetch default LLM Provider")
        raise HTTPException(status_code=400, detail="No LLM Provider setup")

    functions_with_args: list[tuple[Callable, tuple]] = [
        (test_llm, (llm,)),
        (test_llm, (fast_llm,)),
    ]
    parallel_results = run_functions_tuples_in_parallel(
        functions_with_args, allow_failures=False
    )
    error = parallel_results[0] or (
        parallel_results[1] if len(parallel_results) > 1 else None
    )
    if error:
        raise HTTPException(status_code=400, detail=error)


@admin_router.get("/provider")
def list_llm_providers(
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> list[FullLLMProvider]:
    return [
        FullLLMProvider.from_model(llm_provider_model)
        for llm_provider_model in fetch_existing_llm_providers(db_session)
    ]


@admin_router.get("/embedding-provider")
def list_embedding_providers(
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> list[FullCloudEmbeddingProvider]:
    return [
        FullCloudEmbeddingProvider.from_request(embedding_provider_model)
        for embedding_provider_model in fetch_existing_embedding_providers(db_session)
    ]


@admin_router.put("/provider")
def put_llm_provider(
    llm_provider: LLMProviderUpsertRequest,
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> FullLLMProvider:
    print(llm_provider)
    return upsert_llm_provider(db_session, llm_provider)


@admin_router.delete("/embedding-provider/{embedding_provider_name}")
def delete_embedding_provider(
    embedding_provider_name: str,
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    remove_embedding_provider(db_session, embedding_provider_name)


@admin_router.delete("/provider/{provider_id}")
def delete_llm_provider(
    provider_id: int,
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    remove_llm_provider(db_session, provider_id)


@admin_router.post("/provider/{provider_id}/default")
def set_provider_as_default(
    provider_id: int,
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    update_default_provider(db_session, provider_id)


"""Endpoints for all"""


@basic_router.get("/provider")
def list_llm_provider_basics(
    _: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> list[LLMProviderDescriptor]:
    return [
        LLMProviderDescriptor.from_model(llm_provider_model)
        for llm_provider_model in fetch_existing_llm_providers(db_session)
    ]


@admin_router.get("/built-in/options")
def fetch_llm_options(
    _: User | None = Depends(current_admin_user),
) -> list[WellKnownLLMProviderDescriptor]:
    return fetch_available_well_known_llms()


@basic_router.get("/embedding-provider")
def list_embedding_provider_basics(
    _: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> list[LLMProviderDescriptor]:
    return [
        LLMProviderDescriptor.from_model(llm_provider_model)
        for llm_provider_model in fetch_existing_llm_providers(db_session)
    ]


@admin_router.put("/embedding-provider")
def put_cloud_embedding_provider(
    provider: CloudEmbeddingProviderCreate,
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> FullCloudEmbeddingProvider:
    return upsert_cloud_embedding_provider(db_session, provider)
