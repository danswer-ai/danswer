import argparse
from itertools import chain

from danswer.chunking.chunk import Chunker
from danswer.chunking.chunk import DefaultChunker
from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.app_configs import QDRANT_DEFAULT_COLLECTION
from danswer.connectors.google_drive.batch import BatchGoogleDriveLoader
from danswer.connectors.slack.batch import BatchSlackLoader
from danswer.connectors.type_aliases import BatchLoader
from danswer.connectors.web.batch import BatchWebLoader
from danswer.datastores.interfaces import Datastore
from danswer.datastores.qdrant.indexing import recreate_collection
from danswer.datastores.qdrant.store import QdrantDatastore
from danswer.embedding.biencoder import DefaultEmbedder
from danswer.embedding.type_aliases import Embedder
from danswer.utils.logging import setup_logger


logger = setup_logger()


def load_batch(
    doc_loader: BatchLoader,
    chunker: Chunker,
    embedder: Embedder,
    datastore: Datastore,
):
    num_processed = 0
    total_chunks = 0
    for document_batch in doc_loader.load():
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


def load_slack_batch(file_path: str, qdrant_collection: str):
    logger.info("Loading documents from Slack.")
    load_batch(
        BatchSlackLoader(export_path_str=file_path, batch_size=INDEX_BATCH_SIZE),
        DefaultChunker(),
        DefaultEmbedder(),
        QdrantDatastore(collection=qdrant_collection),
    )


def load_web_batch(url: str, qdrant_collection: str):
    logger.info("Loading documents from web.")
    load_batch(
        BatchWebLoader(base_url=url, batch_size=INDEX_BATCH_SIZE),
        DefaultChunker(),
        DefaultEmbedder(),
        QdrantDatastore(collection=qdrant_collection),
    )


def load_google_drive_batch(qdrant_collection: str):
    logger.info("Loading documents from Google Drive.")
    load_batch(
        BatchGoogleDriveLoader(batch_size=INDEX_BATCH_SIZE),
        DefaultChunker(),
        DefaultEmbedder(),
        QdrantDatastore(collection=qdrant_collection),
    )


class BatchLoadingArgs(argparse.Namespace):
    slack_export_dir: str
    website_url: str
    qdrant_collection: str
    rebuild_index: bool


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--website-url",
        default="https://docs.github.com/en/actions",
    )
    parser.add_argument(
        "--slack-export-dir",
        default="/Users/chrisweaver/Downloads/test-slack-export",
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
    load_web_batch(args.website_url, args.qdrant_collection)
    # load_google_drive_batch(args.qdrant_collection)
