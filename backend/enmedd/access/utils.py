from enmedd.configs.constants import DocumentSource


def prefix_user_email(user_email: str) -> str:
    """Prefixes a user email to eliminate collision with teamspace names.
    This applies to both a enMedD AI user and an External user, this is to make the query time
    more efficient"""
    return f"user_email:{user_email}"


def prefix_teamspace(teamspace_name: str) -> str:
    """Prefixes a user teamspace name to eliminate collision with user emails.
    This assumes that user ids are prefixed with a different prefix."""
    return f"teamspace:{teamspace_name}"


def prefix_external_teamspace(ext_teamspace_name: str) -> str:
    """Prefixes an external teamspace name to eliminate collision with user emails / enMedD AI teamspaces."""
    return f"external_teamspace:{ext_teamspace_name}"


def prefix_teamspace_w_source(ext_teamspace_name: str, source: DocumentSource) -> str:
    """External teamspaces may collide across sources, every source needs its own prefix."""
    return f"{source.value.upper()}_{ext_teamspace_name}"
