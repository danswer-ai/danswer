from danswer.configs.constants import DocumentSource


def prefix_user(user_id: str) -> str:
    """Prefixes a user email to eliminate collision with group names.
    This applies to both a Danswer user and an External user, this is to make the query time
    more efficient"""
    return f"user_email:{user_id}"


def prefix_user_group(user_group_name: str) -> str:
    """Prefixes a user group name to eliminate collision with user emails.
    This assumes that user ids are prefixed with a different prefix."""
    return f"group:{user_group_name}"


def prefix_external_group(ext_group_name: str) -> str:
    """Prefixes an external group name to eliminate collision with user emails / Danswer groups."""
    return f"external_group:{ext_group_name}"


def prefix_group_w_source(ext_group_name: str, source: DocumentSource) -> str:
    """External groups may collide across sources, every source needs its own prefix."""
    return f"{source.value.upper()}_{ext_group_name}"
