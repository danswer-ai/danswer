from collections.abc import Iterator
from dataclasses import dataclass
from datetime import datetime
from string import Template
from typing import List, Set, Dict, Any

from requests import Response, session
from requests.auth import HTTPBasicAuth

from backend.danswer.connectors.jira_service_management.utils import get_text_adf
from backend.danswer.utils.logger import setup_logger
from danswer.connectors.jira_service_management.utils import get_with_default

logger = setup_logger()
CUSTOM_HOST_TEMPLATE = Template("https://$custom_domain.atlassian.net")
# https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/#api-rest-api-3-search-jql-get
GET_ISSUES_ENDPOINT = "/rest/api/3/search/jql"

@dataclass
class Person:
    name: str
    email: str

@dataclass
class JSMIssue:
    id: str
    url: str
    summary: str
    description: str
    comments: List[str]
    created_by: Person
    assigned_to: Person
    last_modified_time: datetime
    labels: List[str]
    priority: str
    resolution: str
    status: str


class JiraServiceManagementAPI:
    def __init__(self,
                 api_token: str,
                 email_id: str,
                 domain_id: str,
                 labels_to_skip: List[str] | None = None
                 ):
        self.domain_id: str = domain_id
        self._base_url = CUSTOM_HOST_TEMPLATE.substitute(custom_domain=domain_id)
        self.jsm_client = session()
        self.jsm_client.auth = HTTPBasicAuth(email_id, api_token)
        self.labels_to_skip: Set[str] = set(labels_to_skip) if labels_to_skip is not None else set()

    def get_issues(self, project_id: str, start_date: str = "", end_date: str = "") -> Iterator[JSMIssue]:
        jql: str = (
            f"project = {project_id} AND "
            f"updated >= '{start_date}' AND "
            f"updated <= '{end_date}'"
        ) if start_date and end_date else f"project = {project_id}"
        next_page_token = None
        try:
            while True:
                response: Response = self.jsm_client.get(self._base_url + GET_ISSUES_ENDPOINT, params=dict(jql=jql, nextPageToken=next_page_token, fields="description,creator,summary,comment,assignee,labels,updated,resolution,status,priority"))
                if response.status_code != 200:
                    logger.error(f"call to jsm server failed with response code: {response.status_code} and reason: {response.text}")
                    break
                json_data = response.json()
                for issue in json_data["issues"]:
                    issue_fields = issue["fields"]
                    if self.labels_to_skip and bool(set(issue_fields["labels"]) & self.labels_to_skip):
                        logger.info(
                            f"Skipping {issue['key']} because it has a label to skip. Found "
                            f"labels: {issue_fields['labels']}. Labels to skip: {self.labels_to_skip}."
                        )
                        continue
                    yield self._issue_json_to_object(issue)
                next_page_token = json_data.get("nextPageToken")
                if next_page_token is None:
                    break
        except Exception as _:
            logger.error(f"Unknown exception occurred while fetching jsm issues for project: ${project_id}", exc_info=True)

    @staticmethod
    def _issue_json_to_object(issue: Dict[str, Any]):
        issue_fields: Dict[str, Any] = issue["fields"]
        summary: str = issue_fields['summary']
        description: str = issue_fields['description']
        comments: List[str] = [get_text_adf(comment.get('body', {})) for comment in get_with_default(issue_fields, "comment", {}).get('comments', [])]
        created_by: Person = Person(issue_fields['creator']['displayName'], issue_fields['creator']['emailAddress'])
        assigned_to: Person = Person(issue_fields['assignee']['displayName'],
                                     issue_fields['assignee']['emailAddress']) if issue_fields.get("assignee") else None
        last_modified_time: datetime = datetime.fromisoformat(issue_fields["updated"])
        return JSMIssue(
            id=issue["id"],
            url=issue["self"],
            summary=summary,
            description=description,
            comments=comments,
            created_by=created_by,
            assigned_to=assigned_to,
            last_modified_time=last_modified_time,
            labels=issue_fields["labels"],
            resolution=get_with_default(issue_fields, "resolution", {}).get("name", ""),
            status=get_with_default(issue_fields, "status", {}).get("name", ""),
            priority=get_with_default(issue_fields, "priority", {}).get("name", ""),
        )

    def __del__(self):
        # closing the session when the object is destroyed
        self.jsm_client.close()
