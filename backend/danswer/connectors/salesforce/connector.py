import io
import os
import json
from datetime import datetime
from datetime import timezone
from typing import Any

from simple_salesforce import Salesforce

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import BasicExpertInfo
from danswer.connectors.models import ConnectorMissingCredentialError
from danswer.connectors.models import Document
from danswer.connectors.models import Section

from danswer.utils.logger import setup_logger


logger = setup_logger()


class SalesforceConnector(LoadConnector, PollConnector):

    def __init__(
        self,
        batch_size: int = INDEX_BATCH_SIZE,
        requested_objects: list[str] = [],
    ) -> None:
        self.batch_size = batch_size
        self.sf_client: Salesforce | None = None
        self.requested_object_list: list[str] = requested_objects
        self.current_object_list: list[str] = []

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        salesforce_username = credentials["salesforce_username"]
        salesforce_password = credentials["salesforce_password"]
        salesforce_security_token = credentials["salesforce_security_token"]

        self.sf_client = Salesforce(
            username=salesforce_username,
            password=salesforce_password,
            security_token=salesforce_security_token,
        )

        return None

    def is_queryable(self, object_name):
        try:
            obj_desc = self.sf_client.__getattr__(object_name).describe()
            return obj_desc['queryable']
        except Exception as e:
            print(f"Error describing {object_name}: {e}")
            return False

    def set_object_list(self) -> None:
        if self.requested_object_list:
            self.current_object_list = self.requested_object_list
        else:
            all_objects = self.sf_client.describe()
            populated_objects = []
            for obj in all_objects:
                if self.is_queryable(obj):
                    populated_objects.append(obj)
            self.current_object_list = populated_objects
    
    # Function to get all fields of an object
    def get_object_fields(self, object_name: str) -> list[str]:
        if self.sf_client is None:
            raise ConnectorMissingCredentialError("Salesforce")
        
        # try:
        #     obj = self.sf_client.__getattr__(object_name)
        #     if callable(getattr(obj, 'describe', None)):
        #         obj_desc = obj.describe()
        #         fields = [field['name'] for field in obj_desc['fields']]
        #         return fields
        
        try:
            obj_desc = self.sf_client.__getattr__(object_name).describe()
            fields = [field['name'] for field in obj_desc['fields']]
            return fields
        except Exception as e:
            print(f"Error describing {object_name}: {e}")
            return []

    def query_object(self, 
                    object_name: str,
                    start: datetime | None = None,
                    end: datetime | None = None,
                    ) -> list[dict[str, Any]]:
        if self.sf_client is None:
            raise ConnectorMissingCredentialError("Salesforce")
        
        fields = self.get_object_fields(object_name)
        query = f"SELECT {', '.join(fields)} FROM {object_name}"

        if start and end:
            query += f" WHERE LastModifiedDate >= {start.isoformat()} AND LastModifiedDate <= {end.isoformat()}"

        try:
            result = self.sf_client.query_all(query)
            if not result['records']:
                print(f"No records found for {object_name}")
                return []
            return result['records']
        except Exception as e:
            print(f"Error querying {object_name}: {e}")
            return []

    # def get_all_data_from_all_objects(self) -> list[dict[str, Any]]:
    #     all_data: list[dict[str, Any]] = []
    #     for object_name in self.current_object_list:
    #         all_data.extend(self.query_object(object_name))
    #     return all_data
        
    def _fetch_from_salesforce(
        self,
        start: datetime | None = None,
        end: datetime | None = None,
    ) -> GenerateDocumentsOutput:

        doc_batch: list[Document] = []
        batch_count = 0
        for salesforce_object_name in self.current_object_list:
            logger.debug(f"Processing: {salesforce_object_name}")

            current_object_data = self.query_object(object_name=salesforce_object_name,
                                                    start=start,
                                                    end=end)

            for object_entry in current_object_data:
                doc_batch.append(
                    self.convert_object_to_document(object_entry)
                )

            batch_count += 1
            if batch_count >= self.batch_size:
                yield doc_batch
                batch_count = 0
                doc_batch = []

        yield doc_batch

    def convert_object_to_document(self, object_dict: dict[str, Any]) -> Document:
        extracted_id = object_dict["id"]
        extracted_link = object_dict["attributes"]["url"]
        extracted_object_text = self.extract_dict_text(object_dict)
        extracted_semantic_identifier = object_dict["name"]
        extracted_doc_updated_at = object_dict["LastModifiedDate"].replace(
                tzinfo=timezone.utc
            )
        extracted_primary_owners = [BasicExpertInfo(
            display_name=object_dict["LastModifiedById"]
        )]
        
        doc = Document(
            id=extracted_id,
            sections=[Section(link=extracted_link, text=extracted_object_text)],
            source=DocumentSource.SALESFORCE,
            semantic_identifier=extracted_semantic_identifier,
            doc_updated_at=extracted_doc_updated_at,
            primary_owners=extracted_primary_owners,
            metadata={},
        )
        return doc
    
    def extract_dict_text(self, object_dict: dict[str, Any]) -> str:
        return json.dumps(object_dict)

    def load_from_state(self) -> GenerateDocumentsOutput:
        return self._fetch_from_salesforce()

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        start_datetime = datetime.utcfromtimestamp(start)
        end_datetime = datetime.utcfromtimestamp(end)
        return self._fetch_from_salesforce(start=start_datetime, end=end_datetime)


if __name__ == "__main__":
    connector = SalesforceConnector(requested_objects=os.environ["REQUESTED_OBJECTS"].split(","))

    connector.load_credentials(
        {
            "salesforce_username": os.environ["SF_USERNAME"],
            "salesforce_password": os.environ["SF_PASSWORD"],
            "salesforce_security_token": os.environ["SF_SECURITY_TOKEN"],
        }
    )
    document_batches = connector.load_from_state()
    print(next(document_batches))
