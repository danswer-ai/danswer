import ast
import json
import re
from collections.abc import Sequence
from datetime import datetime
from datetime import timedelta
from typing import Any

from danswer.context.search.models import InferenceSection


def normalize_whitespace(text: str) -> str:
    """Normalize whitespace in text to single spaces and strip leading/trailing whitespace."""
    import re

    return re.sub(r"\s+", " ", text.strip())


# Post-processing
def format_docs(docs: Sequence[InferenceSection]) -> str:
    return "\n\n".join(doc.combined_content for doc in docs)


def clean_and_parse_list_string(json_string: str) -> list[dict]:
    # Remove any prefixes/labels before the actual JSON content
    json_string = re.sub(r"^.*?(?=\[)", "", json_string, flags=re.DOTALL)

    # Remove markdown code block markers and any newline prefixes
    cleaned_string = re.sub(r"```json\n|\n```", "", json_string)
    cleaned_string = cleaned_string.replace("\\n", " ").replace("\n", " ")
    cleaned_string = " ".join(cleaned_string.split())

    # Try parsing with json.loads first, fall back to ast.literal_eval
    try:
        return json.loads(cleaned_string)
    except json.JSONDecodeError:
        try:
            return ast.literal_eval(cleaned_string)
        except (ValueError, SyntaxError) as e:
            raise ValueError(f"Failed to parse JSON string: {cleaned_string}") from e


def clean_and_parse_json_string(json_string: str) -> dict[str, Any]:
    # Remove markdown code block markers and any newline prefixes
    cleaned_string = re.sub(r"```json\n|\n```", "", json_string)
    cleaned_string = cleaned_string.replace("\\n", " ").replace("\n", " ")
    cleaned_string = " ".join(cleaned_string.split())
    # Parse the cleaned string into a Python dictionary
    return json.loads(cleaned_string)


def format_entity_term_extraction(entity_term_extraction_dict: dict[str, Any]) -> str:
    entities = entity_term_extraction_dict["entities"]
    terms = entity_term_extraction_dict["terms"]
    relationships = entity_term_extraction_dict["relationships"]

    entity_strs = ["\nEntities:\n"]
    for entity in entities:
        entity_str = f"{entity['entity_name']} ({entity['entity_type']})"
        entity_strs.append(entity_str)

    entity_str = "\n - ".join(entity_strs)

    relationship_strs = ["\n\nRelationships:\n"]
    for relationship in relationships:
        relationship_str = f"{relationship['name']} ({relationship['type']}): {relationship['entities']}"
        relationship_strs.append(relationship_str)

    relationship_str = "\n - ".join(relationship_strs)

    term_strs = ["\n\nTerms:\n"]
    for term in terms:
        term_str = f"{term['term_name']} ({term['term_type']}): similar to {term['similar_to']}"
        term_strs.append(term_str)

    term_str = "\n - ".join(term_strs)

    return "\n".join(entity_strs + relationship_strs + term_strs)


def _format_time_delta(time: timedelta) -> str:
    seconds_from_start = f"{((time).seconds):03d}"
    microseconds_from_start = f"{((time).microseconds):06d}"
    return f"{seconds_from_start}.{microseconds_from_start}"


def generate_log_message(
    message: str,
    node_start_time: datetime,
    graph_start_time: datetime | None = None,
) -> str:
    current_time = datetime.now()

    if graph_start_time is not None:
        graph_time_str = _format_time_delta(current_time - graph_start_time)
    else:
        graph_time_str = "N/A"

    node_time_str = _format_time_delta(current_time - node_start_time)

    return f"{graph_time_str} ({node_time_str} s): {message}"
