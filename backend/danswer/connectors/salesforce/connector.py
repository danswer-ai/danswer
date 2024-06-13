import os
from datetime import datetime
from typing import Any

from simple_salesforce import Salesforce
from simple_salesforce import SFType

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.cross_connector_utils.miscellaneous_utils import time_str_to_utc
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import BasicExpertInfo
from danswer.connectors.models import ConnectorMissingCredentialError
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.connectors.salesforce.utils import clean_data
from danswer.connectors.salesforce.utils import json_to_natural_language
from danswer.utils.logger import setup_logger

DEFAULT_PARENT_OBJECT_TYPES = ["Account"]
SF_JSON_FILTER = r"Id$|Date$|Is|Has|stamp|url"
MAX_QUERY_LENGTH = 10000  # max query length is 20,000 characters

logger = setup_logger()


def extract_dict_text(unprocessed_object_dict: dict) -> str:
    processed_dict = clean_data(unprocessed_object_dict)
    natural_language_dict = json_to_natural_language(processed_dict)
    return natural_language_dict


class SalesforceConnector(LoadConnector, PollConnector):
    def __init__(
        self,
        batch_size: int = INDEX_BATCH_SIZE,
        requested_objects: list[str] = [],
    ) -> None:
        self.batch_size = batch_size
        self.sf_client: Salesforce | None = None
        self.requested_parent_object_list: list[str] = requested_objects
        self.parent_object_list: list[str] = DEFAULT_PARENT_OBJECT_TYPES

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

    def _get_id_name(self, id: str) -> str:
        if self.sf_client is None:
            raise ConnectorMissingCredentialError("Salesforce")

        user_object_info = self.sf_client.query(
            f"SELECT Name FROM User WHERE Id = '{id}'"
        )
        name = user_object_info.get("Records", [{}])[0].get("Name", "Null User")
        return name

    def _convert_object_instance_to_document(
        self, object_dict: dict[str, Any]
    ) -> Document:
        if self.sf_client is None:
            raise ConnectorMissingCredentialError("Salesforce")

        extracted_id = object_dict["Id"]
        extracted_link = f"https://{self.sf_client.sf_instance}/{extracted_id}"
        extracted_doc_updated_at = time_str_to_utc(object_dict["LastModifiedDate"])
        extracted_object_text = extract_dict_text(object_dict)
        extracted_semantic_identifier = object_dict["name"]
        extracted_primary_owners = [
            BasicExpertInfo(
                display_name=self._get_id_name(object_dict["LastModifiedById"])
            )
        ]

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

    def _is_valid_child_object(self, child_relationship: dict):
        if self.sf_client is None:
            raise ConnectorMissingCredentialError("Salesforce")

        if not child_relationship["childSObject"]:
            return False
        if not child_relationship["relationshipName"]:
            return False

        object_type = child_relationship["childSObject"]
        # sf_object = SFType(object_type, sf.session_id, sf.sf_instance)
        # object_description = sf_object.describe()
        # if not object_description['queryable']:
        #     return False

        try:
            query = f"SELECT Count() FROM {object_type} LIMIT 1"
            result = self.sf_client.query(query)
            if result["totalSize"] == 0:
                return False
        except Exception as e:
            print(f"Object type {object_type} doesn't support query: {e}")
            return False

        if child_relationship["field"]:
            if child_relationship["field"] == "RelatedToId":
                return False
        else:
            return False

        return True

    def _get_all_children_of_sf_type(self, sf_type: str):
        if self.sf_client is None:
            raise ConnectorMissingCredentialError("Salesforce")

        sf_object = SFType(
            sf_type, self.sf_client.session_id, self.sf_client.sf_instance
        )
        object_description = sf_object.describe()

        children_objects: list[dict] = []
        for child_relationship in object_description["childRelationships"]:
            if self._is_valid_child_object(child_relationship):
                children_objects.append(
                    {
                        "relationship_name": child_relationship["relationshipName"],
                        "object_type": child_relationship["childSObject"],
                    }
                )
        return children_objects

    def _get_all_fields_for_sf_type(self, sf_type: str):
        if self.sf_client is None:
            raise ConnectorMissingCredentialError("Salesforce")

        sf_object = SFType(
            sf_type, self.sf_client.session_id, self.sf_client.sf_instance
        )
        all_account_objects = sf_object.describe()
        # if sf_type == "Attachment":
        #     print(json.dumps(all_account_objects, indent=2))
        fields = []
        for field in all_account_objects["fields"]:
            # print("field:", field['name'])
            if field:
                if field["type"] == "base64":
                    print("field:", field["name"])
                    continue
                fields.append(field["name"])
        return fields

    def _generate_query_per_parent_type(self, parent_sf_type: str):
        parent_fields = self._get_all_fields_for_sf_type(parent_sf_type)
        child_sf_types = self._get_all_children_of_sf_type(parent_sf_type)

        query = f"SELECT {', '.join(parent_fields)}"
        for child_object_dict in child_sf_types:
            fields = self._get_all_fields_for_sf_type(child_object_dict["object_type"])
            query_addition = f", \n(SELECT {', '.join(fields)} FROM {child_object_dict['relationship_name']})"

            if len(query_addition) + len(query) > MAX_QUERY_LENGTH:
                query += f"\n FROM {parent_sf_type}"
                yield query
                query = f"SELECT {', '.join(parent_fields)}" + query_addition
            else:
                query += query_addition

        query += f"\n FROM {parent_sf_type}"

        yield query

    def _fetch_from_salesforce(
        self,
        start: datetime | None = None,
        end: datetime | None = None,
    ) -> GenerateDocumentsOutput:
        if self.sf_client is None:
            raise ConnectorMissingCredentialError("Salesforce")

        parent_object_types = DEFAULT_PARENT_OBJECT_TYPES
        if self.requested_parent_object_list:
            parent_object_types = self.requested_parent_object_list

        doc_batch: list[Document] = []
        for parent_object_type in parent_object_types:
            logger.debug(f"Processing: {parent_object_type}")
            for query in self._generate_query_per_parent_type(parent_object_type):
                if start is not None and end is not None:
                    query += f"WHERE CreatedDate > {start.isoformat()} AND CreatedDate < {end.isoformat()}"
                query_result = self.sf_client.query_all(query)

                for record_dict in query_result["records"]:
                    doc_batch.append(
                        self._convert_object_instance_to_document(record_dict)
                    )

                    if len(doc_batch) > self.batch_size:
                        yield doc_batch
                        doc_batch = []
        yield doc_batch

    def load_from_state(self) -> GenerateDocumentsOutput:
        if self.sf_client is None:
            raise ConnectorMissingCredentialError("Salesforce")
        return self._fetch_from_salesforce()

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        if self.sf_client is None:
            raise ConnectorMissingCredentialError("Salesforce")
        start_datetime = datetime.utcfromtimestamp(start)
        end_datetime = datetime.utcfromtimestamp(end)
        return self._fetch_from_salesforce(start=start_datetime, end=end_datetime)


if __name__ == "__main__":
    connector = SalesforceConnector(
        requested_objects=os.environ["REQUESTED_OBJECTS"].split(",")
    )

    connector.load_credentials(
        {
            "salesforce_username": os.environ["SF_USERNAME"],
            "salesforce_password": os.environ["SF_PASSWORD"],
            "salesforce_security_token": os.environ["SF_SECURITY_TOKEN"],
        }
    )
    document_batches = connector.load_from_state()
    print(next(document_batches))
