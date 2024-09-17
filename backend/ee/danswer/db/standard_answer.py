import re
import string
from collections.abc import Sequence

from sqlalchemy import or_
from sqlalchemy import select
from sqlalchemy.orm import Session

from danswer.db.models import Persona__StandardAnswer
from danswer.db.models import StandardAnswer
from danswer.db.persona import get_personas_by_ids
from danswer.utils.logger import setup_logger

logger = setup_logger()


def insert_standard_answer(
    keyword: str,
    answer: str,
    match_regex: bool,
    match_any_keywords: bool,
    apply_globally: bool,
    persona_ids: list[int],
    db_session: Session,
) -> StandardAnswer:
    existing_personas = get_personas_by_ids(
        persona_ids=persona_ids,
        db_session=db_session,
    )
    if len(existing_personas) != len(persona_ids):
        raise ValueError(f"Some or all personas with ids {persona_ids} do not exist")

    standard_answer = StandardAnswer(
        keyword=keyword,
        answer=answer,
        active=True,
        match_regex=match_regex,
        match_any_keywords=match_any_keywords,
        apply_globally=apply_globally,
        personas=existing_personas,
    )
    db_session.add(standard_answer)
    db_session.commit()
    return standard_answer


def update_standard_answer(
    standard_answer_id: int,
    keyword: str,
    answer: str,
    match_regex: bool,
    match_any_keywords: bool,
    apply_globally: bool,
    persona_ids: list[int],
    db_session: Session,
) -> StandardAnswer:
    standard_answer = db_session.scalar(
        select(StandardAnswer).where(StandardAnswer.id == standard_answer_id)
    )
    if standard_answer is None:
        raise ValueError(f"No standard answer with id {standard_answer_id}")

    existing_personas = get_personas_by_ids(
        persona_ids=persona_ids,
        db_session=db_session,
    )
    if len(existing_personas) != len(persona_ids):
        raise ValueError(f"Some or all personas with ids {persona_ids} do not exist")

    standard_answer.keyword = keyword
    standard_answer.answer = answer
    standard_answer.match_regex = match_regex
    standard_answer.match_any_keywords = match_any_keywords
    standard_answer.apply_globally = apply_globally
    standard_answer.personas = list(existing_personas)

    db_session.commit()

    return standard_answer


def remove_standard_answer(
    standard_answer_id: int,
    db_session: Session,
) -> None:
    standard_answer = db_session.scalar(
        select(StandardAnswer).where(StandardAnswer.id == standard_answer_id)
    )
    if standard_answer is None:
        raise ValueError(f"No standard answer with id {standard_answer_id}")

    standard_answer.active = False
    db_session.commit()


def fetch_standard_answer(
    standard_answer_id: int,
    db_session: Session,
) -> StandardAnswer | None:
    return db_session.scalar(
        select(StandardAnswer).where(StandardAnswer.id == standard_answer_id)
    )


def fetch_standard_answers(db_session: Session) -> Sequence[StandardAnswer]:
    return db_session.scalars(
        select(StandardAnswer).where(StandardAnswer.active.is_(True))
    ).all()


def get_standard_answers_for_personas_or_global(
    persona_ids: list[int], db_session: Session
) -> Sequence[StandardAnswer]:
    answer_ids_for_persona = select(Persona__StandardAnswer.standard_answer_id).where(
        Persona__StandardAnswer.persona_id.in_(persona_ids)
    )
    return db_session.scalars(
        select(StandardAnswer).where(
            or_(
                StandardAnswer.apply_globally.is_(True),
                StandardAnswer.id.in_(answer_ids_for_persona),
            )
        )
    ).all()


def find_matching_standard_answers(
    id_in: list[int],
    query: str,
    db_session: Session,
) -> list[tuple[StandardAnswer, str]]:
    """
    Returns a list of tuples, where each tuple is a StandardAnswer definition matching
    the query and a string representing the match (either the regex match group or the
    set of keywords).

    If `answer_instance.match_regex` is true, the definition is considered "matched"
    if the query matches the `answer_instance.keyword` using `re.search`.

    Otherwise, the definition is considered "matched" if the space-delimited tokens
    in `keyword` exists in `query`, depending on the state of `match_any_keywords`
    """
    stmt = (
        select(StandardAnswer)
        .where(StandardAnswer.active.is_(True))
        .where(StandardAnswer.id.in_(id_in))
    )
    possible_standard_answers: Sequence[StandardAnswer] = db_session.scalars(stmt).all()

    matching_standard_answers: list[tuple[StandardAnswer, str]] = []
    for standard_answer in possible_standard_answers:
        if standard_answer.match_regex:
            maybe_matches = re.search(standard_answer.keyword, query, re.IGNORECASE)
            if maybe_matches is not None:
                match_group = maybe_matches.group(0)
                matching_standard_answers.append((standard_answer, match_group))

        else:
            # Remove punctuation and split the keyword into individual words
            keyword_words = set(
                "".join(
                    char
                    for char in standard_answer.keyword.lower()
                    if char not in string.punctuation
                ).split()
            )

            # Remove punctuation and split the query into individual words
            query_words = "".join(
                char for char in query.lower() if char not in string.punctuation
            ).split()

            # Check if all of the keyword words are in the query words
            if standard_answer.match_any_keywords:
                for word in query_words:
                    if word in keyword_words:
                        matching_standard_answers.append((standard_answer, word))
                        break
            else:
                if all(word in query_words for word in keyword_words):
                    matching_standard_answers.append(
                        (
                            standard_answer,
                            re.sub(r"\s+?", ", ", standard_answer.keyword),
                        )
                    )

    return matching_standard_answers
