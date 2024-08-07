from enum import Enum as PyEnum


class IndexingStatus(str, PyEnum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    SUCCESS = "success"
    FAILED = "failed"


# these may differ in the future, which is why we're okay with this duplication
class DeletionStatus(str, PyEnum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    SUCCESS = "success"
    FAILED = "failed"


# Consistent with Celery task statuses
class TaskStatus(str, PyEnum):
    PENDING = "PENDING"
    STARTED = "STARTED"
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"


class IndexModelStatus(str, PyEnum):
    PAST = "PAST"
    PRESENT = "PRESENT"
    FUTURE = "FUTURE"


class ChatSessionSharedStatus(str, PyEnum):
    PUBLIC = "public"
    PRIVATE = "private"


class DefaultPage(str, PyEnum):
    CHAT = "chat"
    SEARCH = "search"


class WorkspaceSubscriptionPlan(str, PyEnum):
    BASIC = "basic"
    PROFESSIONAL = "professional"
    ORGANIZATION = "organization"


class InstanceSubscriptionPlan(str, PyEnum):
    ENTERPRISE = "enterprise"
    PARTNER = "partner"