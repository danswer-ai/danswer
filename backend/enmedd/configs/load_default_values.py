import yaml
from sqlalchemy.orm import Session

from enmedd.db.instance import upsert_instance
from enmedd.db.workspace import upsert_workspace

DEFAULT_DATA_YAML = "./enmedd/configs/default_values.yaml"


def load_default_instance_from_yaml(
    db_session: Session,
    default_data_yaml: str = DEFAULT_DATA_YAML,
) -> None:
    with open(default_data_yaml, "r") as file:
        data = yaml.safe_load(file)

    instances = data.get("instances", [])
    for instance in instances:
        upsert_instance(
            db_session=db_session,
            id=instance["id"],
            instance_name=instance["instance_name"],
            subscription_plan=instance["subscription_plan"] if not None else None,
            owner_id=instance["owner_id"] if not None else None,
            commit=True,
        )


def load_workspace_from_yaml(
    db_session: Session,
    default_data_yaml: str = DEFAULT_DATA_YAML,
) -> None:
    with open(default_data_yaml, "r") as file:
        data = yaml.safe_load(file)

    workspaces = data.get("workspaces", [])
    for workspace in workspaces:
        upsert_workspace(
            id=workspace["id"],
            workspace_name=workspace["workspace_name"],
            instance_id=workspace["instance_id"],
            custom_logo=workspace["custom_logo"] if not None else None,
            custom_header_logo=workspace["custom_header_logo"] if not None else None,
            db_session=db_session,
            commit=True,
        )
