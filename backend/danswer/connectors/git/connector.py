import datetime
import glob
import logging
import shutil
import tempfile
from argparse import ArgumentParser
from os import path
from typing import Any, Union, Generator

import pygit2

from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import LoadConnector, GenerateDocumentsOutput
from danswer.connectors.models import Document, Section
from danswer.utils.logger import setup_logger

logger = setup_logger()


class PygitRemoteCallbacks(pygit2.RemoteCallbacks):
    auth_private_key: str | None
    last_transfer_progress: datetime.datetime = datetime.datetime.fromtimestamp(0)

    def __init__(self, auth_private_key: str | None):
        super().__init__(None, None)
        self.auth_private_key = auth_private_key

    def credentials(self, url, username_from_url, allowed_types):
        if allowed_types & pygit2.enums.CredentialType.USERNAME:
            logger.info(f"Responding with username {username_from_url}")
            return pygit2.Username(username_from_url)
        elif allowed_types & pygit2.enums.CredentialType.SSH_MEMORY:
            keypair = pygit2.KeypairFromMemory(username_from_url, None, self.auth_private_key, "")
            logger.info(f"Responding with keypair")
            return keypair
        else:
            logger.warning(f"Received request for credential, but don't support any type in {allowed_types}")
            return None

    def sideband_progress(self, msg: str):
        logger.debug(f"Clone progress: remote: {msg}")

    def transfer_progress(self, stats: pygit2.remotes.TransferProgress):
        now = datetime.datetime.now()
        if (now - self.last_transfer_progress).total_seconds() >= 15:
            self.last_transfer_progress = now
            if stats.indexed_objects != stats.total_objects:
                logger.info(f"Transfer: received {stats.received_objects}/{stats.total_objects} objects")
            elif stats.indexed_objects != stats.total_objects:
                logger.info(f"Clone progress: indexed {stats.indexed_objects}/{stats.total_objects} objects")
            else:
                logger.info(f"Clone progress: resolved {stats.indexed_deltas}/{stats.total_deltas} deltas")


class GitConnector(LoadConnector):
    def __init__(self, remote_url: str, branch: str, auth_private_key: str, include_globs: str):
        if not pygit2.features & pygit2.GIT_FEATURE_SSH:
            raise Exception("pygit2 was not built with SSH support")
        if not pygit2.features & pygit2.GIT_FEATURE_HTTPS:
            raise Exception("pygit2 was not built with HTTPS support")

        self.remote_url = remote_url
        self.branch = branch
        self.auth_private_key = auth_private_key
        self.include_globs = include_globs.split(", ")

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        if credentials:
            logger.warning("Unexpected credentials provided for Git connector")
        return None

    def load_from_state(self) -> GenerateDocumentsOutput:
        work_dir = tempfile.mkdtemp("danswer-connector-git")
        try:
            logger.info(f"Cloning {self.remote_url} into {work_dir}")
            username = "git"
            callbacks = PygitRemoteCallbacks(self.auth_private_key)
            # FIXME: understand why depth=1 (for a shallow clone) causes "error reading from remote repository"
            pygit2.clone_repository(
                self.remote_url,
                work_dir,
                checkout_branch=self.branch,
                callbacks=callbacks,
            )

            matches = [
                match[len(work_dir) + 1:]
                for pattern in self.include_globs
                for match in glob.glob(path.join(work_dir, pattern))
            ]
            logger.info(f"Found {len(matches)} matches")

            for i in range(0, len(matches), 25):
                doc_batch: list[Document] = []
                for match in matches[i:i + 25]:
                    with open(path.join(work_dir, match), "r") as f:
                        content = f.read()
                    uri = f"{self.remote_url}/{match}"
                    doc_batch.append(
                        Document(
                            id=uri,
                            sections=[
                                Section(link=uri, text=content),
                            ],
                            source=DocumentSource.GIT,
                            semantic_identifier=uri,
                            metadata={},
                        )
                    )
                yield doc_batch
        finally:
            logger.info(f"Cleaning up {work_dir}")
            shutil.rmtree(work_dir)


class ParsedArguments:
    remote_url: str
    branch: str
    auth_private_key: str
    include_globs: str


def parse_args() -> ParsedArguments:
    parser = ArgumentParser()
    parser.add_argument("--remote-url")
    parser.add_argument("--branch")
    parser.add_argument("--auth-private-key")
    parser.add_argument("--include-globs")
    return parser.parse_args(namespace=ParsedArguments())


if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG)
    args = parse_args()
    try:
        with open(args.auth_private_key, "r") as f:
            auth_private_key = f.read()
    except TypeError:
        auth_private_key = None

    connector = GitConnector(args.remote_url, args.branch, auth_private_key, args.include_globs)
    document_batches = connector.load_from_state()
    print(next(document_batches))
