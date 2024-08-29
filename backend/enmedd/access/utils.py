def prefix_user(user_id: str) -> str:
    """Prefixes a user ID to eliminate collision with team names.
    This assumes that teams are prefixed with a different prefix."""
    return f"user_id:{user_id}"


def prefix_teamspace(teamspace_name: str) -> str:
    """Prefixes a teamspace name to eliminate collision with user IDs.
    This assumes that user ids are prefixed with a different prefix."""
    return f"group:{teamspace_name}"
