def name_teamspace_sync_task(teamspace_id: int) -> str:
    return f"teamspace_sync_task__{teamspace_id}"


def name_chat_ttl_task(retention_limit_days: int) -> str:
    return f"chat_ttl_{retention_limit_days}_days"
