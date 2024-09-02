from collections.abc import Sequence
from functools import lru_cache
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import delete
from sqlalchemy import func
from sqlalchemy import or_
from sqlalchemy import select
from sqlalchemy import update
from sqlalchemy.orm import Session

from enmedd.auth.schemas import UserRole
from enmedd.db.document_set import get_document_sets_by_ids
from enmedd.db.engine import get_sqlalchemy_engine
from enmedd.db.models import Assistant
from enmedd.db.models import Assistant__Teamspace
from enmedd.db.models import Assistant__User
from enmedd.db.models import DocumentSet
from enmedd.db.models import Prompt
from enmedd.db.models import StarterMessage
from enmedd.db.models import Tool
from enmedd.db.models import User
from enmedd.db.models import User__Teamspace
from enmedd.search.enums import RecencyBiasSetting
from enmedd.server.features.assistant.models import AssistantSnapshot
from enmedd.server.features.assistant.models import CreateAssistantRequest
from enmedd.utils.logger import setup_logger
from enmedd.utils.variable_functionality import fetch_versioned_implementation

logger = setup_logger()


def make_assistant_private(
    assistant_id: int,
    user_ids: list[UUID] | None,
    team_ids: list[int] | None,
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
    if team_ids:
        raise NotImplementedError("enMedD AI does not support private Assistants")


def create_update_assistant(
    assistant_id: int | None,
    create_assistant_request: CreateAssistantRequest,
    user: User | None,
    db_session: Session,
) -> AssistantSnapshot:
    """Higher level function than upsert_assistant, although either is valid to use."""
    # Permission to actually use these is checked later
    document_sets = list(
        get_document_sets_by_ids(
            document_set_ids=create_assistant_request.document_set_ids,
            db_session=db_session,
        )
    )
    prompts = list(
        get_prompts_by_ids(
            prompt_ids=create_assistant_request.prompt_ids,
            db_session=db_session,
        )
    )

    try:
        assistant = upsert_assistant(
            assistant_id=assistant_id,
            user=user,
            name=create_assistant_request.name,
            description=create_assistant_request.description,
            num_chunks=create_assistant_request.num_chunks,
            llm_relevance_filter=create_assistant_request.llm_relevance_filter,
            llm_filter_extraction=create_assistant_request.llm_filter_extraction,
            recency_bias=create_assistant_request.recency_bias,
            prompts=prompts,
            tool_ids=create_assistant_request.tool_ids,
            document_sets=document_sets,
            llm_model_provider_override=create_assistant_request.llm_model_provider_override,
            llm_model_version_override=create_assistant_request.llm_model_version_override,
            starter_messages=create_assistant_request.starter_messages,
            is_public=create_assistant_request.is_public,
            db_session=db_session,
        )

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
    assistant = fetch_assistant_by_id(db_session=db_session, assistant_id=assistant_id)
    if not assistant:
        raise HTTPException(
            status_code=404, detail=f"Assistant with ID {assistant_id} not found"
        )

    check_user_can_edit_assistant(user=user, assistant=assistant)

    if assistant.is_public:
        raise HTTPException(status_code=400, detail="Cannot share public assistant")

    versioned_make_assistant_private = fetch_versioned_implementation(
        "enmedd.db.assistant", "make_assistant_private"
    )

    # Privatize Assistant
    versioned_make_assistant_private(
        assistant_id=assistant_id,
        user_ids=user_ids,
        team_ids=None,
        db_session=db_session,
    )


def fetch_assistant_by_id(db_session: Session, assistant_id: int) -> Assistant | None:
    return db_session.scalar(select(Assistant).where(Assistant.id == assistant_id))


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
    # if user_id is `None` assume the user is an admin or auth is disabled
    user_id: UUID | None,
    db_session: Session,
    include_default: bool = True,
    include_deleted: bool = False,
) -> Sequence[Assistant]:
    stmt = select(Assistant).distinct()
    if user_id is not None:
        # Subquery to find all teams the user belongs to
        teamspaces_subquery = (
            select(User__Teamspace.teamspace_id)
            .where(User__Teamspace.user_id == user_id)
            .subquery()
        )

        # Include assistants where the user is directly related or part of a teamspace that has access
        access_conditions = or_(
            Assistant.is_public == True,  # noqa: E712
            Assistant.id.in_(  # User has access through list of users with access
                select(Assistant__User.assistant_id).where(
                    Assistant__User.user_id == user_id
                )
            ),
            Assistant.id.in_(  # User is part of a group that has access
                select(Assistant__Teamspace.assistant_id).where(
                    Assistant__Teamspace.teamspace_id.in_(teamspaces_subquery)  # type: ignore
                )
            ),
        )
        stmt = stmt.where(access_conditions)

    if not include_default:
        stmt = stmt.where(Assistant.default_assistant.is_(False))
    if not include_deleted:
        stmt = stmt.where(Assistant.deleted.is_(False))

    return db_session.scalars(stmt).all()


def mark_assistant_as_deleted(
    assistant_id: int,
    user: User | None,
    db_session: Session,
) -> None:
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
            Assistant.name == assistant_name, Assistant.default_assistant == is_default
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
    assistants = get_assistants(user_id=None, db_session=db_session)
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
    prompts: list[Prompt] | None,
    document_sets: list[DocumentSet] | None,
    llm_model_provider_override: str | None,
    llm_model_version_override: str | None,
    starter_messages: list[StarterMessage] | None,
    is_public: bool,
    db_session: Session,
    tool_ids: list[int] | None = None,
    assistant_id: int | None = None,
    default_assistant: bool = False,
    commit: bool = True,
) -> Assistant:
    if assistant_id is not None:
        assistant = db_session.query(Assistant).filter_by(id=assistant_id).first()
    else:
        assistant = get_assistant_by_name(
            assistant_name=name, user=user, db_session=db_session
        )

    # Fetch and attach tools by IDs
    tools = None
    if tool_ids is not None:
        tools = db_session.query(Tool).filter(Tool.id.in_(tool_ids)).all()
        if not tools and tool_ids:
            raise ValueError("Tools not found")

    if assistant:
        if not default_assistant and assistant.default_assistant:
            raise ValueError("Cannot update default assistant with non-default.")

        check_user_can_edit_assistant(user=user, assistant=assistant)

        assistant.name = name
        assistant.description = description
        assistant.num_chunks = num_chunks
        assistant.llm_relevance_filter = llm_relevance_filter
        assistant.llm_filter_extraction = llm_filter_extraction
        assistant.recency_bias = recency_bias
        assistant.default_assistant = default_assistant
        assistant.llm_model_provider_override = llm_model_provider_override
        assistant.llm_model_version_override = llm_model_version_override
        assistant.starter_messages = starter_messages
        assistant.deleted = False  # Un-delete if previously deleted
        assistant.is_public = is_public

        # Do not delete any associations manually added unless
        # a new updated list is provided
        if document_sets is not None:
            assistant.document_sets.clear()
            assistant.document_sets = document_sets or []

        if prompts is not None:
            assistant.prompts.clear()
            assistant.prompts = prompts

        if tools is not None:
            assistant.tools = tools

    else:
        assistant = Assistant(
            id=assistant_id,
            user_id=user.id if user else None,
            is_public=is_public,
            name=name,
            description=description,
            num_chunks=num_chunks,
            llm_relevance_filter=llm_relevance_filter,
            llm_filter_extraction=llm_filter_extraction,
            recency_bias=recency_bias,
            default_assistant=default_assistant,
            prompts=prompts or [],
            document_sets=document_sets or [],
            llm_model_provider_override=llm_model_provider_override,
            llm_model_version_override=llm_model_version_override,
            starter_messages=starter_messages,
            tools=tools or [],
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
        .where(Assistant.default_assistant, Assistant.id > 0)
        .values(deleted=True, name=func.concat(Assistant.name, "_old"))
    )

    db_session.execute(stmt)
    db_session.commit()


def update_assistant_visibility(
    assistant_id: int,
    is_visible: bool,
    db_session: Session,
) -> None:
    assistant = get_assistant_by_id(
        assistant_id=assistant_id, user=None, db_session=db_session
    )
    assistant.is_visible = is_visible
    db_session.commit()


def check_user_can_edit_assistant(user: User | None, assistant: Assistant) -> None:
    # if user is None, assume that no-auth is turned on
    if user is None:
        return

    # admins can edit everything
    if user.role == UserRole.ADMIN:
        return

    # otherwise, make sure user owns assistant
    if assistant.user_id != user.id:
        raise HTTPException(
            status_code=403,
            detail=f"User not authorized to edit assistant with ID {assistant.id}",
        )


def get_prompts_by_ids(prompt_ids: list[int], db_session: Session) -> Sequence[Prompt]:
    """Unsafe, can fetch prompts from all users"""
    if not prompt_ids:
        return []
    prompts = db_session.scalars(select(Prompt).where(Prompt.id.in_(prompt_ids))).all()

    return prompts


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


def get_assistant_by_id(
    assistant_id: int,
    # if user is `None` assume the user is an admin or auth is disabled
    user: User | None,
    db_session: Session,
    include_deleted: bool = False,
    is_for_edit: bool = True,  # NOTE: assume true for safety
) -> Assistant:
    stmt = select(Assistant).where(Assistant.id == assistant_id)

    or_conditions = []

    # if user is an admin, they should have access to all Assistants
    if user is not None and user.role != UserRole.ADMIN:
        or_conditions.extend(
            [Assistant.user_id == user.id, Assistant.user_id.is_(None)]
        )

        # if we aren't editing, also give access to all public assistants
        if not is_for_edit:
            or_conditions.append(Assistant.is_public.is_(True))

    if or_conditions:
        stmt = stmt.where(or_(*or_conditions))

    if not include_deleted:
        stmt = stmt.where(Assistant.deleted.is_(False))

    result = db_session.execute(stmt)
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


def get_assistant_by_name(
    assistant_name: str, user: User | None, db_session: Session
) -> Assistant | None:
    """Admins can see all, regular users can only fetch their own.
    If user is None, assume the user is an admin or auth is disabled."""
    stmt = select(Assistant).where(Assistant.name == assistant_name)
    if user and user.role != UserRole.ADMIN:
        stmt = stmt.where(Assistant.user_id == user.id)
    result = db_session.execute(stmt).scalar_one_or_none()
    return result


def delete_assistant_by_name(
    assistant_name: str, db_session: Session, is_default: bool = True
) -> None:
    stmt = delete(Assistant).where(
        Assistant.name == assistant_name, Assistant.default_assistant == is_default
    )

    db_session.execute(stmt)

    db_session.commit()
