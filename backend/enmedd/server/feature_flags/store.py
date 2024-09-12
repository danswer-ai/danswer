from typing import cast

from fastapi import Depends

from enmedd.auth.users import current_admin_user
from enmedd.db.models import User
from enmedd.dynamic_configs.factory import get_dynamic_config_store
from enmedd.dynamic_configs.interface import ConfigNotFoundError
from enmedd.server.feature_flags.models import FeatureFlags
from enmedd.utils.logger import setup_logger

_FEATURE_FLAG_KEY = "enmedd_feature_flag"
logger = setup_logger()


def load_feature_flags() -> FeatureFlags:
    dynamic_config_store = get_dynamic_config_store()
    try:
        feature_flag = FeatureFlags(
            **cast(dict, dynamic_config_store.load(_FEATURE_FLAG_KEY))
        )
    except ConfigNotFoundError:
        feature_flag = FeatureFlags()
        dynamic_config_store.store(_FEATURE_FLAG_KEY, feature_flag.dict())

    return feature_flag


def store_feature_flags(
    feature_flag: FeatureFlags, _: User | None = Depends(current_admin_user)
) -> None:
    logger.info("Updating feature flag values")
    get_dynamic_config_store().store(_FEATURE_FLAG_KEY, feature_flag.dict())
