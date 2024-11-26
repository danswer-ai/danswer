import yaml
from sqlalchemy import exists
from sqlalchemy import select
from sqlalchemy.orm import Session

from enmedd.db.instance import upsert_instance
from enmedd.db.models import Instance
from enmedd.db.models import Workspace
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
        instance_id = instance["id"]

        exists_query = select(exists().where(Instance.id == instance_id))
        result = db_session.execute(exists_query).scalar()

        if not result:
            upsert_instance(
                db_session=db_session,
                id=instance_id,
                instance_name=instance["instance_name"],
                subscription_plan=instance["subscription_plan"]
                if instance["subscription_plan"]
                else None,
                owner_id=instance["owner_id"] if instance["owner_id"] else None,
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
        workspace_id = workspace["id"]

        exists_query = select(exists().where(Workspace.id == workspace_id))
        result = db_session.execute(exists_query).scalar()

        if not result:
            upsert_workspace(
                id=workspace_id,
                workspace_name=workspace["workspace_name"],
                instance_id=workspace["instance_id"],
                custom_logo=workspace["custom_logo"],
                custom_header_logo=workspace["custom_header_logo"],
                brand_color=workspace["brand_color"],
                secondary_color=workspace["secondary_color"],
                db_session=db_session,
                commit=True,
            )
