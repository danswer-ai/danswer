from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from enmedd.auth.users import current_admin_user
from enmedd.db.models import User
from enmedd.server.feature_flags.models import FeatureFlags
from enmedd.server.feature_flags.store import load_feature_flags
from enmedd.server.feature_flags.store import store_feature_flags


router = APIRouter(prefix="/ff")
instance_admin_router = APIRouter(prefix="/ff/instance-admin")


@router.get("")
def fetch_feature_flags() -> FeatureFlags:
    return load_feature_flags()


# only instance admin can only turn on and off feature flags
@instance_admin_router.put("")
def put_feature_flags(
    feature_flags: FeatureFlags, _: User | None = Depends(current_admin_user)
) -> None:
    try:
        feature_flags.check_validity()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    store_feature_flags(feature_flags)
