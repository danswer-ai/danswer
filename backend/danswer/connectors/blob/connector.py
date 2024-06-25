import os
from datetime import datetime
from datetime import timezone
from io import BytesIO
from typing import Any

import boto3
from botocore.client import BaseClient
from botocore.client import Config

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import ConnectorMissingCredentialError
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.file_processing.extract_file_text import extract_file_text
from danswer.utils.logger import setup_logger


logger = setup_logger()


class BlobStorageConnector(LoadConnector, PollConnector):
    def __init__(
        self,
        bucket_type: str,
        bucket_name: str,
        prefix: str = "",
        batch_size: int = INDEX_BATCH_SIZE,
        use_r2: bool = False,
    ) -> None:
        self.bucket_type = bucket_type
        self.bucket_name = bucket_name
        self.prefix = prefix if not prefix or prefix.endswith("/") else prefix + "/"
        self.batch_size = batch_size
        self.use_r2 = use_r2
        self.s3_client: BaseClient | None = None

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        logger.info(
            f"Loading credentials for {self.bucket_name} or type {self.bucket_type}"
        )

        if self.bucket_type == "R2":
            if not all(
                credentials.get(key)
                for key in ["r2_access_key_id", "r2_secret_access_key", "account_id"]
            ):
                raise ConnectorMissingCredentialError("Cloudflare R2")
            self.s3_client = boto3.client(
                "s3",
                endpoint_url=f"https://{credentials['account_id']}.r2.cloudflarestorage.com",
                aws_access_key_id=credentials["r2_access_key_id"],
                aws_secret_access_key=credentials["r2_secret_access_key"],
                region_name="auto",
                config=Config(signature_version="s3v4"),
            )

        elif self.bucket_type == "S3":
            if not all(
                credentials.get(key)
                for key in ["aws_access_key_id", "aws_secret_access_key"]
            ):
                raise ConnectorMissingCredentialError("Google Cloud Storage")

            session = boto3.Session(
                aws_access_key_id=credentials["aws_access_key_id"],
                aws_secret_access_key=credentials["aws_secret_access_key"],
            )
            self.s3_client = session.client("s3")

        elif self.bucket_type == "GOOGLE_CLOUD_STORAGE":
            if not all(
                credentials.get(key)
                for key in ["access_key_id", "secret_access_key", "project_id"]
            ):
                raise ConnectorMissingCredentialError("Google Cloud Storage")

            self.s3_client = boto3.client(
                "s3",
                endpoint_url="https://storage.googleapis.com",
                aws_access_key_id=credentials["access_key_id"],
                aws_secret_access_key=credentials["secret_access_key"],
                region_name="auto",
            )

        elif self.bucket_type == "OCI_STORAGE":
            if not all(
                credentials.get(key)
                for key in ["namespace", "region", "access_key_id", "secret_access_key"]
            ):
                raise ConnectorMissingCredentialError("Oracle Cloud Infrastructure")

            self.s3_client = boto3.client(
                "s3",
                endpoint_url=f"https://{credentials['namespace']}.compat.objectstorage.{credentials['region']}.oraclecloud.com",
                aws_access_key_id=credentials["access_key_id"],
                aws_secret_access_key=credentials["secret_access_key"],
                region_name=credentials["region"],
            )

        else:
            raise ValueError(f"Unsupported bucket type: {self.bucket_type}")

        return None

    def _download_object(self, key: str) -> bytes:
        if self.s3_client is None:
            raise ConnectorMissingCredentialError("Blob storage")
        object = self.s3_client.get_object(Bucket=self.bucket_name, Key=key)
        return object["Body"].read()

    def _get_presigned_url(self, key: str) -> str:
        logger.info("Getting presigned url")
        if self.s3_client is None:
            raise ConnectorMissingCredentialError("Blog storage")

        url = self.s3_client.generate_presigned_url(
            "get_object", Params={"Bucket": self.bucket_name, "Key": key}, ExpiresIn=0
        )
        return url

    def _yield_objects(
        self,
        start: datetime,
        end: datetime,
    ) -> GenerateDocumentsOutput:
        if self.s3_client is None:
            raise ConnectorMissingCredentialError("Blog storage")

        paginator = self.s3_client.get_paginator("list_objects_v2")
        pages = paginator.paginate(Bucket=self.bucket_name, Prefix=self.prefix)

        batch: list[Document] = []
        for page in pages:
            if "Contents" not in page:
                continue

            for obj in page["Contents"]:
                if obj["Key"].endswith("/"):
                    continue

                last_modified = obj["LastModified"].replace(tzinfo=timezone.utc)

                if not start <= last_modified <= end:
                    continue

                downloaded_file = self._download_object(obj["Key"])
                link = self._get_presigned_url(obj["Key"])
                name = os.path.basename(obj["Key"])

                try:
                    text = extract_file_text(
                        name,
                        BytesIO(downloaded_file),
                        break_on_unprocessable=False,
                    )
                    batch.append(
                        Document(
                            id=f"{self.bucket_type}:{self.bucket_name}:{obj['Key']}",
                            sections=[Section(link=link, text=text)],
                            source=DocumentSource(self.bucket_type.lower()),
                            semantic_identifier=name,
                            doc_updated_at=last_modified,
                            metadata={"type": "article"},
                        )
                    )
                    if len(batch) == self.batch_size:
                        yield batch
                        batch = []

                except Exception as e:
                    logger.exception(
                        f"Error decoding object {obj['Key']} as UTF-8: {e}"
                    )
        if batch:
            yield batch

    def load_from_state(self) -> GenerateDocumentsOutput:
        return self._yield_objects(
            start=datetime(1970, 1, 1, tzinfo=timezone.utc),
            end=datetime.now(timezone.utc),
        )

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        if self.s3_client is None:
            raise ConnectorMissingCredentialError("Blog storage")

        start_datetime = datetime.fromtimestamp(start, tz=timezone.utc)
        end_datetime = datetime.fromtimestamp(end, tz=timezone.utc)

        for batch in self._yield_objects(start_datetime, end_datetime):
            yield batch

        return None
