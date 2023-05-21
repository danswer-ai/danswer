# This file is only for development purposes
import argparse
from itertools import chain

from danswer.chunking.chunk import Chunker
from danswer.chunking.chunk import DefaultChunker
from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.app_configs import QDRANT_DEFAULT_COLLECTION
from danswer.connectors.confluence.connector import ConfluenceConnector
from danswer.connectors.github.connector import GithubConnector
from danswer.connectors.google_drive.connector import GoogleDriveConnector
from danswer.connectors.google_drive.connector_auth import backend_get_credentials
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.slack.connector import SlackConnector
from danswer.connectors.web.connector import WebConnector
from danswer.datastores.interfaces import Datastore
from danswer.datastores.qdrant.indexing import recreate_collection
from danswer.datastores.qdrant.store import QdrantDatastore
from danswer.semantic_search.biencoder import DefaultEmbedder
from danswer.semantic_search.type_aliases import Embedder
from danswer.utils.logging import setup_logger


logger = setup_logger()


def load_batch(
    doc_loader: LoadConnector,
    chunker: Chunker,
    embedder: Embedder,
    datastore: Datastore,
) -> None:
    num_processed = 0
    total_chunks = 0
    for document_batch in doc_loader.load_from_state():
        if not document_batch:
            logger.warning("No parseable documents found in batch")
            continue

        logger.info(f"Indexed {num_processed} documents")
        document_chunks = list(
            chain(*[chunker.chunk(document) for document in document_batch])
        )
        num_chunks = len(document_chunks)
        total_chunks += num_chunks
        logger.info(
            f"Document batch yielded {num_chunks} chunks for a total of {total_chunks}"
        )
        chunks_with_embeddings = embedder.embed(document_chunks)
        datastore.index(chunks_with_embeddings)
        num_processed += len(document_batch)
    logger.info(f"Finished, indexed a total of {num_processed} documents")


def load_slack_batch(file_path: str, qdrant_collection: str) -> None:
    logger.info("Loading documents from Slack.")
    load_batch(
        SlackConnector(export_path_str=file_path, batch_size=INDEX_BATCH_SIZE),
        DefaultChunker(),
        DefaultEmbedder(),
        QdrantDatastore(collection=qdrant_collection),
    )


def load_web_batch(url: str, qdrant_collection: str) -> None:
    logger.info("Loading documents from web.")
    load_batch(
        WebConnector(base_url=url, batch_size=INDEX_BATCH_SIZE),
        DefaultChunker(),
        DefaultEmbedder(),
        QdrantDatastore(collection=qdrant_collection),
    )


def load_google_drive_batch(qdrant_collection: str) -> None:
    logger.info("Loading documents from Google Drive.")
    backend_get_credentials()
    load_batch(
        GoogleDriveConnector(batch_size=INDEX_BATCH_SIZE),
        DefaultChunker(),
        DefaultEmbedder(),
        QdrantDatastore(collection=qdrant_collection),
    )


def load_github_batch(owner: str, repo: str, qdrant_collection: str) -> None:
    logger.info("Loading documents from Github.")
    load_batch(
        GithubConnector(repo_owner=owner, repo_name=repo, batch_size=INDEX_BATCH_SIZE),
        DefaultChunker(),
        DefaultEmbedder(),
        QdrantDatastore(collection=qdrant_collection),
    )


def load_confluence_batch(confluence_wiki_url: str, qdrant_collection: str) -> None:
    logger.info("Loading documents from Confluence.")
    load_batch(
        ConfluenceConnector(confluence_wiki_url, batch_size=INDEX_BATCH_SIZE),
        DefaultChunker(),
        DefaultEmbedder(),
        QdrantDatastore(collection=qdrant_collection),
    )


class BatchLoadingArgs(argparse.Namespace):
    website_url: str
    github_owner: str
    github_repo: str
    slack_export_dir: str
    confluence_link: str
    qdrant_collection: str
    rebuild_index: bool


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--website-url",
        default="https://docs.github.com/en/actions",
    )
    parser.add_argument(
        "--github-owner",
        default="danswer-ai",
    )
    parser.add_argument(
        "--github-repo",
        default="danswer",
    )
    parser.add_argument(
        "--slack-export-dir",
        default="~/Downloads/test-slack-export",
    )
    parser.add_argument(
        "--confluence_link",
        default="https://danswer.atlassian.net/wiki/spaces/fakespace",
    )
    parser.add_argument(
        "--qdrant-collection",
        default=QDRANT_DEFAULT_COLLECTION,
    )
    parser.add_argument(
        "--rebuild-index",
        action="store_true",
        help="Deletes and repopulates the semantic search index",
    )
    args = parser.parse_args(namespace=BatchLoadingArgs)

    if args.rebuild_index:
        recreate_collection(args.qdrant_collection)

    # load_slack_batch(args.slack_export_dir, args.qdrant_collection)
    # load_web_batch(args.website_url, args.qdrant_collection)
    # load_google_drive_batch(args.qdrant_collection)
    # load_github_batch(args.github_owner, args.github_repo, args.qdrant_collection)
    load_confluence_batch(args.confluence_link, args.qdrant_collection)
