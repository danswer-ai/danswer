import os
from datetime import datetime
from datetime import timezone
from typing import Any

import requests

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.utils.logger import setup_logger

logger = setup_logger()


class LinearConnector(LoadConnector, PollConnector):
    def __init__(
        self,
        batch_size: int = INDEX_BATCH_SIZE,
    ) -> None:
        self.batch_size = batch_size

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        self.linear_api_key = credentials["linear_api_key"]
        return None

    def _process_issues(
        self, start_str: datetime | None = None, end_str: datetime | None = None
    ) -> GenerateDocumentsOutput:
        lte_filter = f'lte: "{end_str}"' if end_str else ""
        gte_filter = f'gte: "{start_str}"' if start_str else ""
        updatedAtFilter = f"""
            {lte_filter}
            {gte_filter}
        """

        query = (
            """
            query IterateIssueBatches($first: Int, $after: String) {
                issues(
                    orderBy: updatedAt, 
                    first: $first, 
                    after: $after,
                    filter: {
                        updatedAt: {
        """
            + updatedAtFilter
            + """
                        },

                    }
                ) {
                    edges {
                        node {
                            id
                            createdAt
                            updatedAt
                            archivedAt
                            number
                            title
                            priority
                            estimate
                            sortOrder
                            startedAt
                            completedAt
                            startedTriageAt
                            triagedAt
                            canceledAt
                            autoClosedAt
                            autoArchivedAt
                            dueDate
                            slaStartedAt
                            slaBreachesAt
                            trashed
                            snoozedUntilAt
                            team {
                                name
                            }
                            previousIdentifiers
                            subIssueSortOrder
                            priorityLabel
                            identifier
                            url
                            branchName
                            customerTicketCount
                            description
                            descriptionData
                            comments {
                                nodes {
                                    url
                                    body
                                }
                            }
                        }
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        """
        )

        headers = {
            "Authorization": self.linear_api_key,
            "Content-Type": "application/json",
        }

        has_more = True
        pagination_start = None
        while has_more:
            graphql_query = {
                "query": query,
                "variables": {
                    "first": self.batch_size,
                    "after": pagination_start,
                },
            }
            logger.debug(f"Requesting issues from Linear with query: {graphql_query}")

            response = requests.post(
                "https://api.linear.app/graphql",
                headers=headers,
                json=graphql_query,
                timeout=60,
            )
            if not response.ok:
                raise RuntimeError(
                    f"Error fetching issues from Linear: {response.text}"
                )

            response_json = response.json()
            logger.debug(f"Raw response from Linear: {response_json}")
            edges = response_json["data"]["issues"]["edges"]

            documents: list[Document] = []
            for edge in edges:
                node = edge["node"]
                documents.append(
                    Document(
                        id=node["id"],
                        sections=[
                            Section(
                                link=node["url"],
                                text=node["description"],
                            )
                        ]
                        + [
                            Section(
                                link=node["url"],
                                text=comment["body"],
                            )
                            for comment in node["comments"]["nodes"]
                        ],
                        source=DocumentSource.LINEAR,
                        semantic_identifier=node["identifier"],
                        metadata={
                            "updated_at": node["updatedAt"],
                            "team": node["team"]["name"],
                        },
                    )
                )
                yield documents

            pagination_start = response_json["data"]["issues"]["pageInfo"]["endCursor"]
            has_more = response_json["data"]["issues"]["pageInfo"]["hasNextPage"]

    def load_from_state(self) -> GenerateDocumentsOutput:
        yield from self._process_issues()

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        start_time = datetime.fromtimestamp(start, tz=timezone.utc)
        end_time = datetime.fromtimestamp(end, tz=timezone.utc)

        yield from self._process_issues(start_str=start_time, end_str=end_time)


if __name__ == "__main__":
    connector = LinearConnector()
    connector.load_credentials({"linear_api_key": os.environ["LINEAR_API_KEY"]})
    document_batches = connector.load_from_state()
    print(next(document_batches))
