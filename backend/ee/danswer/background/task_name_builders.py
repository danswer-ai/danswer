def name_user_group_sync_task(user_group_id: int) -> str:
    return f"user_group_sync_task__{user_group_id}"


def name_chat_ttl_task(retention_limit_days: int) -> str:
    return f"chat_ttl_{retention_limit_days}_days"


def name_sync_external_permissions_task(cc_pair_id: int) -> str:
    return f"sync_external_permissions_task__{cc_pair_id}"
