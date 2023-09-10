# This file is purely for development use, not included in any builds
import argparse
import json
import os
import subprocess
from datetime import datetime

import requests
from qdrant_client.http.models.models import SnapshotDescription
from typesense.exceptions import ObjectNotFound  # type: ignore

from alembic import command
from alembic.config import Config
from danswer.configs.app_configs import DOCUMENT_INDEX_NAME
from danswer.configs.app_configs import POSTGRES_DB
from danswer.configs.app_configs import POSTGRES_HOST
from danswer.configs.app_configs import POSTGRES_PASSWORD
from danswer.configs.app_configs import POSTGRES_PORT
from danswer.configs.app_configs import POSTGRES_USER
from danswer.configs.app_configs import QDRANT_HOST
from danswer.configs.app_configs import QDRANT_PORT
from danswer.datastores.qdrant.utils import create_qdrant_collection
from danswer.datastores.qdrant.utils import list_qdrant_collections
from danswer.datastores.typesense.store import create_typesense_collection
from danswer.datastores.vespa.store import DOCUMENT_ID_ENDPOINT
from danswer.utils.clients import get_qdrant_client
from danswer.utils.clients import get_typesense_client
from danswer.utils.logger import setup_logger

logger = setup_logger()


def save_postgres(filename: str) -> None:
    logger.info("Attempting to take Postgres snapshot")
    cmd = f"pg_dump -U {POSTGRES_USER} -h {POSTGRES_HOST} -p {POSTGRES_PORT} -W -F t {POSTGRES_DB} > {filename}"
    subprocess.run(
        cmd, shell=True, check=True, input=f"{POSTGRES_PASSWORD}\n", text=True
    )


def load_postgres(filename: str) -> None:
    logger.info("Attempting to load Postgres snapshot")
    try:
        alembic_cfg = Config("alembic.ini")
        command.upgrade(alembic_cfg, "head")
    except Exception:
        logger.info("Alembic upgrade failed, maybe already has run")
    cmd = f"pg_restore --clean -U {POSTGRES_USER} -h {POSTGRES_HOST} -p {POSTGRES_PORT} -W -d {POSTGRES_DB} -1 {filename}"
    subprocess.run(
        cmd, shell=True, check=True, input=f"{POSTGRES_PASSWORD}\n", text=True
    )


def snapshot_time_compare(snap: SnapshotDescription) -> datetime:
    if not hasattr(snap, "creation_time") or snap.creation_time is None:
        raise RuntimeError("Qdrant Snapshots Failed")
    return datetime.strptime(snap.creation_time, "%Y-%m-%dT%H:%M:%S")


def save_qdrant(filename: str) -> None:
    logger.info("Attempting to take Qdrant snapshot")
    qdrant_client = get_qdrant_client()
    qdrant_client.create_snapshot(collection_name=DOCUMENT_INDEX_NAME)
    snapshots = qdrant_client.list_snapshots(collection_name=DOCUMENT_INDEX_NAME)
    valid_snapshots = [snap for snap in snapshots if snap.creation_time is not None]

    sorted_snapshots = sorted(valid_snapshots, key=snapshot_time_compare)
    last_snapshot_name = sorted_snapshots[-1].name
    url = f"http://{QDRANT_HOST}:{QDRANT_PORT}/collections/{DOCUMENT_INDEX_NAME}/snapshots/{last_snapshot_name}"

    response = requests.get(url, stream=True)

    if response.status_code != 200:
        raise RuntimeError("Qdrant Save Failed")

    with open(filename, "wb") as file:
        for chunk in response.iter_content(chunk_size=8192):
            file.write(chunk)


def load_qdrant(filename: str) -> None:
    logger.info("Attempting to load Qdrant snapshot")
    if DOCUMENT_INDEX_NAME not in {
        collection.name for collection in list_qdrant_collections().collections
    }:
        create_qdrant_collection(DOCUMENT_INDEX_NAME)
    snapshot_url = f"http://{QDRANT_HOST}:{QDRANT_PORT}/collections/{DOCUMENT_INDEX_NAME}/snapshots/"

    with open(filename, "rb") as f:
        files = {"snapshot": (os.path.basename(filename), f)}
        response = requests.post(snapshot_url + "upload", files=files)
        if response.status_code != 200:
            raise RuntimeError("Qdrant Snapshot Upload Failed")

    data = {"location": snapshot_url + os.path.basename(filename)}
    headers = {"Content-Type": "application/json"}
    response = requests.put(
        snapshot_url + "recover", data=json.dumps(data), headers=headers
    )
    if response.status_code != 200:
        raise RuntimeError("Loading Qdrant Snapshot Failed")


def save_typesense(filename: str) -> None:
    logger.info("Attempting to take Typesense snapshot")
    ts_client = get_typesense_client()
    all_docs = ts_client.collections[DOCUMENT_INDEX_NAME].documents.export()
    with open(filename, "w") as f:
        f.write(all_docs)


def load_typesense(filename: str) -> None:
    logger.info("Attempting to load Typesense snapshot")
    ts_client = get_typesense_client()
    try:
        ts_client.collections[DOCUMENT_INDEX_NAME].delete()
    except ObjectNotFound:
        pass

    create_typesense_collection(DOCUMENT_INDEX_NAME)

    with open(filename) as jsonl_file:
        ts_client.collections[DOCUMENT_INDEX_NAME].documents.import_(
            jsonl_file.read().encode("utf-8"), {"action": "create"}
        )


def save_vespa(filename: str) -> None:
    logger.info("Attempting to take Vespa snapshot")
    continuation = ""
    params = {}
    doc_jsons: list[dict] = []
    while continuation is not None:
        if continuation:
            params = {"continuation": continuation}
        response = requests.get(DOCUMENT_ID_ENDPOINT, params=params)
        response.raise_for_status()
        found = response.json()
        continuation = found.get("continuation")
        docs = found["documents"]
        for doc in docs:
            doc_json = {"update": doc["id"], "create": True, "fields": doc["fields"]}
            doc_jsons.append(doc_json)

    with open(filename, "w") as jsonl_file:
        for doc in doc_jsons:
            json_str = json.dumps(doc)
            jsonl_file.write(json_str + "\n")


def load_vespa(filename: str) -> None:
    headers = {"Content-Type": "application/json"}
    with open(filename, "r") as f:
        for line in f:
            new_doc = json.loads(line.strip())
            doc_id = new_doc["update"].split("::")[-1]
            response = requests.post(
                DOCUMENT_ID_ENDPOINT + "/" + doc_id, headers=headers, json=new_doc
            )
            response.raise_for_status()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Danswer checkpoint saving and loading."
    )
    parser.add_argument(
        "--save", action="store_true", help="Save Danswer state to directory."
    )
    parser.add_argument(
        "--load", action="store_true", help="Load Danswer state from save directory."
    )
    parser.add_argument(
        "--checkpoint_dir",
        type=str,
        default=os.path.join("..", "danswer_checkpoint"),
        help="A directory to store temporary files to.",
    )

    args = parser.parse_args()
    checkpoint_dir = args.checkpoint_dir

    if not os.path.exists(checkpoint_dir):
        os.makedirs(checkpoint_dir)

    if not args.save and not args.load:
        raise ValueError("Must specify --save or --load")

    if args.load:
        load_postgres(os.path.join(checkpoint_dir, "postgres_snapshot.tar"))
        load_vespa(os.path.join(checkpoint_dir, "vespa_snapshot.jsonl"))
        # load_qdrant(os.path.join(checkpoint_dir, "qdrant.snapshot"))
        # load_typesense(os.path.join(checkpoint_dir, "typesense_snapshot.jsonl"))
    else:
        save_postgres(os.path.join(checkpoint_dir, "postgres_snapshot.tar"))
        save_vespa(os.path.join(checkpoint_dir, "vespa_snapshot.jsonl"))
        # save_qdrant(os.path.join(checkpoint_dir, "qdrant.snapshot"))
        # save_typesense(os.path.join(checkpoint_dir, "typesense_snapshot.jsonl"))
