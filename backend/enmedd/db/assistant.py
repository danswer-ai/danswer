from collections.abc import Sequence
from datetime import datetime
from functools import lru_cache
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import delete
from sqlalchemy import exists
from sqlalchemy import func
from sqlalchemy import or_
from sqlalchemy import Select
from sqlalchemy import select
from sqlalchemy import update
from sqlalchemy.orm import aliased
from sqlalchemy.orm import joinedload
from sqlalchemy.orm import Session

from enmedd.auth.schemas import UserRole
from enmedd.configs.chat_configs import BING_API_KEY
from enmedd.configs.chat_configs import CONTEXT_CHUNKS_ABOVE
from enmedd.configs.chat_configs import CONTEXT_CHUNKS_BELOW
from enmedd.db.engine import get_sqlalchemy_engine
from enmedd.db.models import Assistant
from enmedd.db.models import Assistant__Teamspace
from enmedd.db.models import Assistant__User
from enmedd.db.models import DocumentSet
from enmedd.db.models import Prompt
from enmedd.db.models import StarterMessage
from enmedd.db.models import Teamspace
from enmedd.db.models import Tool
from enmedd.db.models import User
from enmedd.db.models import User__Teamspace
from enmedd.search.enums import RecencyBiasSetting
from enmedd.server.features.assistant.models import AssistantSnapshot
from enmedd.server.features.assistant.models import CreateAssistantRequest
from enmedd.utils.logger import setup_logger
from enmedd.utils.variable_functionality import fetch_versioned_implementation

logger = setup_logger()


def _add_user_filters(
    stmt: Select, user: User | None, get_editable: bool = True
) -> Select:
    # If user is None, assume the user is an admin or auth is disabled
    if user is None or user.role == UserRole.ADMIN:
        return stmt

    Assistant__UG = aliased(Assistant__Teamspace)
    User__UG = aliased(User__Teamspace)
    """
    Here we select cc_pairs by relation:
    User -> User__Teamspace -> Assistant__Teamspace -> Assistant
    """
    stmt = (
        stmt.outerjoin(Assistant__UG)
        .outerjoin(
            User__Teamspace,
            User__Teamspace.teamspace_id == Assistant__UG.teamspace_id,
        )
        .outerjoin(
            Assistant__User,
            Assistant__User.assistant_id == Assistant.id,
        )
    )
    """
    Filter Assistants by:
    - if the user is in the teamspace that owns the Assistant
    - if editing is being done, we also filter out Assistants that are owned by groups
    that the user isn't associated with
    - if we are not editing, we show all Assistants that are public or directly connected to the user
    """
    where_clause = User__Teamspace.user_id == user.id

    if get_editable:
        teamspaces = select(User__UG.teamspace_id).where(User__UG.user_id == user.id)

        where_clause &= (
            ~exists()
            .where(Assistant__UG.assistant_id == Assistant.id)
            .where(~Assistant__UG.teamspace_id.in_(teamspaces))
            .correlate(Assistant)
        )
    else:
        where_clause |= Assistant.is_public == True  # noqa: E712
        where_clause &= Assistant.is_visible == True  # noqa: E712
        where_clause |= Assistant__User.user_id == user.id
    where_clause |= Assistant.user_id == user.id

    return stmt.where(where_clause)


def fetch_assistant_by_id(
    db_session: Session, assistant_id: int, user: User | None, get_editable: bool = True
) -> Assistant:
    stmt = select(Assistant).where(Assistant.id == assistant_id).distinct()
    stmt = _add_user_filters(stmt=stmt, user=user, get_editable=get_editable)
    assistant = db_session.scalars(stmt).one_or_none()
    if not assistant:
        raise HTTPException(
            status_code=403,
            detail=f"Assistant with ID {assistant_id} does not exist or user is not authorized to access it",
        )
    return assistant


def _get_assistant_by_name(
    assistant_name: str, user: User | None, db_session: Session
) -> Assistant | None:
    """Admins can see all, regular users can only fetch their own.
    If user is None, assume the user is an admin or auth is disabled."""
    stmt = select(Assistant).where(Assistant.name == assistant_name)
    if user and user.role != UserRole.ADMIN:
        stmt = stmt.where(Assistant.user_id == user.id)
    result = db_session.execute(stmt).scalar_one_or_none()
    return result


def make_assistant_private(
    assistant_id: int,
    user_ids: list[UUID] | None,
    group_ids: list[int] | None,
    db_session: Session,
) -> None:
    if user_ids is not None:
        db_session.query(Assistant__User).filter(
            Assistant__User.assistant_id == assistant_id
        ).delete(synchronize_session="fetch")

        for user_uuid in user_ids:
            db_session.add(
                Assistant__User(assistant_id=assistant_id, user_id=user_uuid)
            )

        db_session.commit()

    # May cause error if someone switches down to MIT from EE
    # TODO: modify this behavior
    if group_ids:
        raise NotImplementedError("enMedD AI does not support private Assistants")


def create_update_assistant(
    assistant_id: int | None,
    create_assistant_request: CreateAssistantRequest,
    user: User | None,
    db_session: Session,
) -> AssistantSnapshot:
    """Higher level function than upsert_assistant, although either is valid to use."""
    # Permission to actually use these is checked later

    try:
        assistant_data = {
            "assistant_id": assistant_id,
            "user": user,
            "db_session": db_session,
            **create_assistant_request.dict(exclude={"users", "groups"}),
        }

        assistant = upsert_assistant(**assistant_data)

        versioned_make_assistant_private = fetch_versioned_implementation(
            "enmedd.db.assistant", "make_assistant_private"
        )

        # Privatize Assistant
        versioned_make_assistant_private(
            assistant_id=assistant.id,
            user_ids=create_assistant_request.users,
            team_ids=create_assistant_request.groups,
            db_session=db_session,
        )

    except ValueError as e:
        logger.exception("Failed to create assistant")
        raise HTTPException(status_code=400, detail=str(e))

    return AssistantSnapshot.from_model(assistant)


def update_assistant_shared_users(
    assistant_id: int,
    user_ids: list[UUID],
    user: User | None,
    db_session: Session,
) -> None:
    """Simplified version of `create_update_assistant` which only touches the
    accessibility rather than any of the logic (e.g. prompt, connected data sources,
    etc.)."""
    assistant = fetch_assistant_by_id(
        db_session=db_session, assistant_id=assistant_id, user=user, get_editable=True
    )

    if assistant.is_public:
        raise HTTPException(status_code=400, detail="Cannot share public assistant")

    versioned_make_assistant_private = fetch_versioned_implementation(
        "enmedd.db.assistant", "make_assistant_private"
    )

    # Privatize Assistant
    versioned_make_assistant_private(
        assistant_id=assistant_id,
        user_ids=user_ids,
        group_ids=None,
        db_session=db_session,
    )


def update_assistant_public_status(
    assistant_id: int,
    is_public: bool,
    db_session: Session,
    user: User | None,
) -> None:
    assistant = fetch_assistant_by_id(
        db_session=db_session, assistant_id=assistant_id, user=user, get_editable=True
    )
    if user and user.role != UserRole.ADMIN and assistant.user_id != user.id:
        raise ValueError("You don't have permission to modify this assistant")

    assistant.is_public = is_public
    db_session.commit()


def get_prompts(
    user_id: UUID | None,
    db_session: Session,
    include_default: bool = True,
    include_deleted: bool = False,
) -> Sequence[Prompt]:
    stmt = select(Prompt).where(
        or_(Prompt.user_id == user_id, Prompt.user_id.is_(None))
    )

    if not include_default:
        stmt = stmt.where(Prompt.default_prompt.is_(False))
    if not include_deleted:
        stmt = stmt.where(Prompt.deleted.is_(False))

    return db_session.scalars(stmt).all()


def get_assistants(
    user: User | None,
    db_session: Session,
    get_editable: bool = True,
    teamspace_id: int | None = None,
    include_default: bool = True,
    include_deleted: bool = False,
    joinedload_all: bool = False,
) -> Sequence[Assistant]:
    stmt = select(Assistant).distinct()
    stmt = _add_user_filters(stmt=stmt, user=user, get_editable=get_editable)

    if teamspace_id is not None:
        stmt = stmt.join(Assistant__Teamspace).where(
            Assistant__Teamspace.teamspace_id == teamspace_id
        )

    if not include_default:
        stmt = stmt.where(Assistant.builtin_assistant.is_(False))
    if not include_deleted:
        stmt = stmt.where(Assistant.deleted.is_(False))

    if joinedload_all:
        stmt = stmt.options(
            joinedload(Assistant.prompts),
            joinedload(Assistant.tools),
            joinedload(Assistant.document_sets),
            joinedload(Assistant.groups),
            joinedload(Assistant.users),
        )

    return db_session.execute(stmt).unique().scalars().all()


def mark_assistant_as_deleted(
    assistant_id: int,
    user: User | None,
    db_session: Session,
    teamspace_id: int | None = None,
) -> None:
    if teamspace_id:
        if user is None:
            raise ValueError(
                "User must be logged in to remove assistant from teamspace."
            )

        user_teamspace_stmt = (
            select(User__Teamspace)
            .where(User__Teamspace.user_id == user.id)
            .where(User__Teamspace.teamspace_id == teamspace_id)
            .where(User__Teamspace.role == UserRole.ADMIN)
        )
        user_teamspace_result = db_session.execute(
            user_teamspace_stmt
        ).scalar_one_or_none()

        if user_teamspace_result is None:
            raise PermissionError(
                "User does not have admin rights in the specified teamspace."
            )

        db_session.execute(
            delete(Assistant__Teamspace).where(
                Assistant__Teamspace.assistant_id == assistant_id,
                Assistant__Teamspace.teamspace_id == teamspace_id,
            )
        )
    else:
        db_session.execute(
            delete(Assistant__Teamspace).where(
                Assistant__Teamspace.assistant_id == assistant_id
            )
        )

        assistant = get_assistant_by_id(
            assistant_id=assistant_id, user=user, db_session=db_session
        )
        assistant.deleted = True

    db_session.commit()


def mark_assistant_as_not_deleted(
    assistant_id: int,
    user: User | None,
    db_session: Session,
) -> None:
    assistant = get_assistant_by_id(
        assistant_id=assistant_id,
        user=user,
        db_session=db_session,
        include_deleted=True,
    )
    if assistant.deleted:
        assistant.deleted = False
        db_session.commit()
    else:
        raise ValueError(f"Assistant with ID {assistant_id} is not deleted.")


def mark_delete_assistant_by_name(
    assistant_name: str, db_session: Session, is_default: bool = True
) -> None:
    stmt = (
        update(Assistant)
        .where(
            Assistant.name == assistant_name, Assistant.builtin_assistant == is_default
        )
        .values(deleted=True)
    )

    db_session.execute(stmt)
    db_session.commit()


def update_all_assistants_display_priority(
    display_priority_map: dict[int, int],
    db_session: Session,
) -> None:
    """Updates the display priority of all lives Assistants"""
    assistants = get_assistants(user=None, db_session=db_session)
    available_assistant_ids = {assistant.id for assistant in assistants}
    if available_assistant_ids != set(display_priority_map.keys()):
        raise ValueError("Invalid assistant IDs provided")

    for assistant in assistants:
        assistant.display_priority = display_priority_map[assistant.id]

    db_session.commit()


def upsert_prompt(
    user: User | None,
    name: str,
    description: str,
    system_prompt: str,
    task_prompt: str,
    include_citations: bool,
    datetime_aware: bool,
    assistants: list[Assistant] | None,
    db_session: Session,
    prompt_id: int | None = None,
    default_prompt: bool = True,
    commit: bool = True,
) -> Prompt:
    if prompt_id is not None:
        prompt = db_session.query(Prompt).filter_by(id=prompt_id).first()
    else:
        prompt = get_prompt_by_name(prompt_name=name, user=user, db_session=db_session)

    if prompt:
        if not default_prompt and prompt.default_prompt:
            raise ValueError("Cannot update default prompt with non-default.")

        prompt.name = name
        prompt.description = description
        prompt.system_prompt = system_prompt
        prompt.task_prompt = task_prompt
        prompt.include_citations = include_citations
        prompt.datetime_aware = datetime_aware
        prompt.default_prompt = default_prompt

        if assistants is not None:
            prompt.assistants.clear()
            prompt.assistants = assistants

    else:
        prompt = Prompt(
            id=prompt_id,
            user_id=user.id if user else None,
            name=name,
            description=description,
            system_prompt=system_prompt,
            task_prompt=task_prompt,
            include_citations=include_citations,
            datetime_aware=datetime_aware,
            default_prompt=default_prompt,
            assistants=assistants or [],
        )
        db_session.add(prompt)

    if commit:
        db_session.commit()
    else:
        # Flush the session so that the Prompt has an ID
        db_session.flush()

    return prompt


def upsert_assistant(
    user: User | None,
    name: str,
    description: str,
    num_chunks: float,
    llm_relevance_filter: bool,
    llm_filter_extraction: bool,
    recency_bias: RecencyBiasSetting,
    llm_model_provider_override: str | None,
    llm_model_version_override: str | None,
    starter_messages: list[StarterMessage] | None,
    is_public: bool,
    db_session: Session,
    prompt_ids: list[int] | None = None,
    document_set_ids: list[int] | None = None,
    tool_ids: list[int] | None = None,
    assistant_id: int | None = None,
    commit: bool = True,
    icon_color: str | None = None,
    icon_shape: int | None = None,
    uploaded_image_id: str | None = None,
    display_priority: int | None = None,
    is_visible: bool = True,
    remove_image: bool | None = None,
    search_start_date: datetime | None = None,
    builtin_assistant: bool = False,
    is_default_assistant: bool = False,
    chunks_above: int = CONTEXT_CHUNKS_ABOVE,
    chunks_below: int = CONTEXT_CHUNKS_BELOW,
) -> Assistant:
    if assistant_id is not None:
        assistant = db_session.query(Assistant).filter_by(id=assistant_id).first()
    else:
        assistant = _get_assistant_by_name(
            assistant_name=name, user=user, db_session=db_session
        )

    # Fetch and attach tools by IDs
    tools = None
    if tool_ids is not None:
        tools = db_session.query(Tool).filter(Tool.id.in_(tool_ids)).all()
        if not tools and tool_ids:
            raise ValueError("Tools not found")

    # Fetch and attach document_sets by IDs
    document_sets = None
    if document_set_ids is not None:
        document_sets = (
            db_session.query(DocumentSet)
            .filter(DocumentSet.id.in_(document_set_ids))
            .all()
        )
        if not document_sets and document_set_ids:
            raise ValueError("document_sets not found")

    # Fetch and attach prompts by IDs
    prompts = None
    if prompt_ids is not None:
        prompts = db_session.query(Prompt).filter(Prompt.id.in_(prompt_ids)).all()
        if not prompts and prompt_ids:
            raise ValueError("prompts not found")

    # ensure all specified tools are valid
    if tools:
        validate_assistant_tools(tools)

    if assistant:
        if not builtin_assistant and assistant.builtin_assistant:
            raise ValueError("Cannot update builtin assistant with non-builtin.")

        # this checks if the user has permission to edit the assistant
        assistant = fetch_assistant_by_id(
            db_session=db_session,
            assistant_id=assistant.id,
            user=user,
            get_editable=True,
        )

        assistant.name = name
        assistant.description = description
        assistant.num_chunks = num_chunks
        assistant.chunks_above = chunks_above
        assistant.chunks_below = chunks_below
        assistant.llm_relevance_filter = llm_relevance_filter
        assistant.llm_filter_extraction = llm_filter_extraction
        assistant.recency_bias = recency_bias
        assistant.builtin_assistant = builtin_assistant
        assistant.llm_model_provider_override = llm_model_provider_override
        assistant.llm_model_version_override = llm_model_version_override
        assistant.starter_messages = starter_messages
        assistant.deleted = False  # Un-delete if previously deleted
        assistant.is_public = is_public
        assistant.icon_color = icon_color
        assistant.icon_shape = icon_shape
        if remove_image or uploaded_image_id:
            assistant.uploaded_image_id = uploaded_image_id
        assistant.display_priority = display_priority
        assistant.is_visible = is_visible
        assistant.search_start_date = search_start_date
        assistant.is_default_assistant = is_default_assistant

        # Do not delete any associations manually added unless
        # a new updated list is provided
        if document_sets is not None:
            assistant.document_sets.clear()
            assistant.document_sets = document_sets or []

        if prompts is not None:
            assistant.prompts.clear()
            assistant.prompts = prompts or []

        if tools is not None:
            assistant.tools = tools or []

    else:
        assistant = Assistant(
            id=assistant_id,
            user_id=user.id if user else None,
            is_public=is_public,
            name=name,
            description=description,
            num_chunks=num_chunks,
            chunks_above=chunks_above,
            chunks_below=chunks_below,
            llm_relevance_filter=llm_relevance_filter,
            llm_filter_extraction=llm_filter_extraction,
            recency_bias=recency_bias,
            builtin_assistant=builtin_assistant,
            prompts=prompts or [],
            document_sets=document_sets or [],
            llm_model_provider_override=llm_model_provider_override,
            llm_model_version_override=llm_model_version_override,
            starter_messages=starter_messages,
            tools=tools or [],
            icon_shape=icon_shape,
            icon_color=icon_color,
            uploaded_image_id=uploaded_image_id,
            display_priority=display_priority,
            is_visible=is_visible,
            search_start_date=search_start_date,
            is_default_assistant=is_default_assistant,
        )
        db_session.add(assistant)

    if commit:
        db_session.commit()
    else:
        # flush the session so that the assistant has an ID
        db_session.flush()

    return assistant


def mark_prompt_as_deleted(
    prompt_id: int,
    user: User | None,
    db_session: Session,
) -> None:
    prompt = get_prompt_by_id(prompt_id=prompt_id, user=user, db_session=db_session)
    prompt.deleted = True
    db_session.commit()


def delete_old_default_assistants(
    db_session: Session,
) -> None:
    """Note, this locks out the Summarize and Paraphrase assistants for now
    Need a more graceful fix later or those need to never have IDs"""
    stmt = (
        update(Assistant)
        .where(Assistant.builtin_assistant, Assistant.id > 0)
        .values(deleted=True, name=func.concat(Assistant.name, "_old"))
    )

    db_session.execute(stmt)
    db_session.commit()


def update_assistant_visibility(
    assistant_id: int,
    is_visible: bool,
    db_session: Session,
    user: User | None = None,
) -> None:
    assistant = fetch_assistant_by_id(
        db_session=db_session, assistant_id=assistant_id, user=user, get_editable=True
    )

    assistant.is_visible = is_visible
    db_session.commit()


def validate_assistant_tools(tools: list[Tool]) -> None:
    for tool in tools:
        if tool.name == "InternetSearchTool" and not BING_API_KEY:
            raise ValueError(
                "Bing API key not found, please contact your enMedD AI admin to get it added!"
            )


def get_prompts_by_ids(prompt_ids: list[int], db_session: Session) -> list[Prompt]:
    """Unsafe, can fetch prompts from all users"""
    if not prompt_ids:
        return []
    prompts = db_session.scalars(
        select(Prompt).where(Prompt.id.in_(prompt_ids)).where(Prompt.deleted.is_(False))
    ).all()

    return list(prompts)


def get_prompt_by_id(
    prompt_id: int,
    user: User | None,
    db_session: Session,
    include_deleted: bool = False,
) -> Prompt:
    stmt = select(Prompt).where(Prompt.id == prompt_id)

    # if user is not specified OR they are an admin, they should
    # have access to all prompts, so this where clause is not needed
    if user and user.role != UserRole.ADMIN:
        stmt = stmt.where(or_(Prompt.user_id == user.id, Prompt.user_id.is_(None)))

    if not include_deleted:
        stmt = stmt.where(Prompt.deleted.is_(False))

    result = db_session.execute(stmt)
    prompt = result.scalar_one_or_none()

    if prompt is None:
        raise ValueError(
            f"Prompt with ID {prompt_id} does not exist or does not belong to user"
        )

    return prompt


def _get_default_prompt(db_session: Session) -> Prompt:
    stmt = select(Prompt).where(Prompt.id == 0)
    result = db_session.execute(stmt)
    prompt = result.scalar_one_or_none()

    if prompt is None:
        raise RuntimeError("Default Prompt not found")

    return prompt


def get_default_prompt(db_session: Session) -> Prompt:
    return _get_default_prompt(db_session)


@lru_cache()
def get_default_prompt__read_only() -> Prompt:
    """Due to the way lru_cache / SQLAlchemy works, this can cause issues
    when trying to attach the returned `Prompt` object to a `Assistant`. If you are
    doing anything other than reading, you should use the `get_default_prompt`
    method instead."""
    with Session(get_sqlalchemy_engine()) as db_session:
        return _get_default_prompt(db_session)


# TODO: since this gets called with every chat message, could it be more efficient to pregenerate
# a direct mapping indicating whether a user has access to a specific assistant?
def get_assistant_by_id(
    assistant_id: int,
    # if user is `None` assume the user is an admin or auth is disabled
    user: User | None,
    db_session: Session,
    include_deleted: bool = False,
    is_for_edit: bool = True,  # NOTE: assume true for safety
) -> Assistant:
    assistant_stmt = (
        select(Assistant)
        .distinct()
        .outerjoin(Assistant.groups)
        .outerjoin(Assistant.users)
        .outerjoin(Teamspace.teamspace_relationships)
        .where(Assistant.id == assistant_id)
    )

    if not include_deleted:
        assistant_stmt = assistant_stmt.where(Assistant.deleted.is_(False))

    if not user or user.role == UserRole.ADMIN:
        result = db_session.execute(assistant_stmt)
        assistant = result.scalar_one_or_none()
        if assistant is None:
            raise ValueError(f"Assistant with ID {assistant_id} does not exist")
        return assistant

    # or check if user owns assistant
    or_conditions = Assistant.user_id == user.id
    # allow access if assistant user id is None
    or_conditions |= Assistant.user_id.is_(None)  # noqa: E711
    if not is_for_edit:
        # if the user is in a group related to the assistant
        or_conditions |= User__Teamspace.user_id == user.id
        # if the user is in the .users of the assistant
        or_conditions |= User.id == user.id
        or_conditions |= Assistant.is_public.is_(True)  # noqa: E712

    assistant_stmt = assistant_stmt.where(or_conditions)
    result = db_session.execute(assistant_stmt)
    assistant = result.scalar_one_or_none()
    if assistant is None:
        raise ValueError(
            f"Assistant with ID {assistant_id} does not exist or does not belong to user"
        )
    return assistant


def get_assistants_by_ids(
    assistant_ids: list[int], db_session: Session
) -> Sequence[Assistant]:
    """Unsafe, can fetch assistants from all users"""
    if not assistant_ids:
        return []
    assistants = db_session.scalars(
        select(Assistant).where(Assistant.id.in_(assistant_ids))
    ).all()

    return assistants


def get_prompt_by_name(
    prompt_name: str, user: User | None, db_session: Session
) -> Prompt | None:
    stmt = select(Prompt).where(Prompt.name == prompt_name)

    # if user is not specified OR they are an admin, they should
    # have access to all prompts, so this where clause is not needed
    if user and user.role != UserRole.ADMIN:
        stmt = stmt.where(Prompt.user_id == user.id)

    result = db_session.execute(stmt).scalar_one_or_none()
    return result


def delete_assistant_by_name(
    assistant_name: str, db_session: Session, is_default: bool = True
) -> None:
    stmt = delete(Assistant).where(
        Assistant.name == assistant_name, Assistant.builtin_assistant == is_default
    )

    db_session.execute(stmt)

    db_session.commit()
