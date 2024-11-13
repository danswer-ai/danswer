from typing import cast

from fastapi import Depends

from enmedd.auth.users import current_workspace_admin_user
from enmedd.db.models import User
from enmedd.key_value_store.factory import get_kv_store
from enmedd.key_value_store.interface import KvKeyNotFoundError
from enmedd.server.feature_flags.models import FeatureFlags
from enmedd.utils.logger import setup_logger

_FEATURE_FLAG_KEY = "enmedd_feature_flag"
logger = setup_logger()


def load_feature_flags() -> FeatureFlags:
    dynamic_config_store = get_kv_store()
    try:
        feature_flag = FeatureFlags(
            **cast(dict, dynamic_config_store.load(_FEATURE_FLAG_KEY))
        )
    except KvKeyNotFoundError:
        feature_flag = FeatureFlags()
        dynamic_config_store.store(_FEATURE_FLAG_KEY, feature_flag.model_dump())

    return feature_flag


def store_feature_flags(
    feature_flag: FeatureFlags, _: User | None = Depends(current_workspace_admin_user)
) -> None:
    logger.info("Updating feature flag values")
    get_kv_store().store(_FEATURE_FLAG_KEY, feature_flag.model_dump())
