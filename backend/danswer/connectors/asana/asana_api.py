from typing import Dict, Iterator
import asana  # type: ignore
from datetime import datetime
import time
import traceback
from danswer.utils.logger import setup_logger

logger = setup_logger()

# See https://github.com/Asana/python-asana/tree/master?tab=readme-ov-file#documentation-for-api-endpoints
# for documentation on how to use the Asana API


class AsanaTask:
    def __init__(
        self,
        id: str,
        title: str,
        text: str,
        link: str,
        last_modified: datetime,
        project_gid: str,
        project_name: str,
    ) -> None:
        self.id = id
        self.title = title
        self.text = text
        self.link = link
        self.last_modified = last_modified
        self.project_gid = project_gid
        self.project_name = project_name

    def __str__(self) -> str:
        return (
            "ID: "
            + self.id
            + "\nTitle: "
            + self.title
            + "\nLast modified: "
            + str(self.last_modified)
            + "\nText: "
            + self.text
        )


class AsanaAPI:
    def __init__(
        self, api_token: str, workspace_gid: str, team_gid: str | None
    ) -> None:
        self.workspace_gid = workspace_gid
        self.team_gid = team_gid
        self.configuration = asana.Configuration()
        self.configuration.access_token = api_token
        self.api_client = asana.ApiClient(self.configuration)
        self.tasks_api = asana.TasksApi(self.api_client)
        self.stories_api = asana.StoriesApi(self.api_client)
        self.users_api = asana.UsersApi(self.api_client)
        self.project_api = asana.ProjectsApi(self.api_client)
        self.workspaces_api = asana.WorkspacesApi(self.api_client)
        self.user_cache: Dict[str, Dict] = {}
        self.api_error_count = 0
        self.task_count = 0

    def get_tasks(
        self, project_gids: list[str] | None, start_date: str
    ) -> Iterator[AsanaTask]:
        """Get all tasks from the projects with the given gids that were modified since the given date.
        If project_gids is None, get all tasks from all projects in the workspace."""
        logger.info("Start getting projects...")
        projects = self.project_api.get_projects(
            opts={
                "workspace": self.workspace_gid,
                "opt_fields": "gid,name,archived,modified_at",
            }
        )
        start_seconds = int(time.mktime(datetime.now().timetuple()))
        projects_list = []
        project_count = 0
        for project_info in projects:
            project_gid = project_info["gid"]
            if project_gids is None or project_gid in project_gids:
                # put in a list ('projects' is a generator) to avoid the "Your pagination token has expired" error later:
                projects_list.append(project_gid)
            else:
                logger.info(
                    f"Skipping project: {project_gid} - not in accepted project_gids"
                )
            project_count += 1
            if project_count % 100 == 0:
                logger.info(f"Found {project_count} projects so far...")
        logger.info(
            f"Found {len(projects_list)} projects, iterating over their tasks now..."
        )
        for project_gid in projects_list:
            for task in self.get_tasks_for_project(
                project_gid, start_date, start_seconds
            ):
                yield task
        logger.info(f"Done getting {self.task_count} docs")
        logger.info(f"Total API errors: {self.api_error_count}")

    def get_tasks_for_project(
        self, project_gid: str, start_date: str, start_seconds: int
    ) -> Iterator[AsanaTask]:
        # Indexing logic:
        # index everything that is not archived and that's public or private but in the team we're interested in
        project = self.project_api.get_project(project_gid, opts={})
        if project["archived"]:
            logger.info(f"Skipping archived project: {project['name']} ({project_gid})")
            return []
        if not project["team"] or not project["team"]["gid"]:
            logger.info(
                f"Skipping project that does not have a team: {project['name']} ({project_gid})"
            )
            return []
        if project["privacy_setting"] == "private":
            # 'private' projects may not really be private, namely when the team_gid is set.
            # We're assuming team_gid refers to an "everyone" team:
            if self.team_gid and project["team"]["gid"] != self.team_gid:
                logger.info(
                    f"Skipping private project that does not have the configured team id '{self.team_gid}': "
                    + f"{project['name']} ({project_gid}) (team: {project['team']['name']})"
                )
                return []
            else:
                logger.info(
                    f"Indexing private project that does have the configured team id '{self.team_gid}': "
                    + f"{project['name']} ({project_gid}) (team: {project['team']['name']})"
                )
        simple_start_date = start_date.split(".")[0].split("+")[0]
        logger.info(
            f"Indexing tasks modified since {simple_start_date} of project {project['name']} ({project_gid})"
        )
        opts = {
            "opt_fields": "name,memberships,memberships.project,completed_at,completed_by,created_at,"
            "created_by,custom_fields,dependencies,due_at,due_on,external,html_notes,liked,likes,"
            "modified_at,notes,num_hearts,parent,projects,resource_subtype,resource_type,start_on,"
            "workspace,permalink_url",
            # contrary to what the documentation says, this will also get tasks for which
            # a new comment was added after start_date:
            "modified_since": start_date,
        }
        tasks_from_api = self.tasks_api.get_tasks_for_project(project_gid, opts)
        for data in tasks_from_api:
            text = ""
            self.task_count += 1
            if self.task_count % 10 == 0:
                end_seconds = time.mktime(datetime.now().timetuple())
                runtime_seconds = end_seconds - start_seconds
                if runtime_seconds > 0:
                    logger.info(
                        f"Got {self.task_count} tasks in {runtime_seconds:.0f} seconds = "
                        + f"{self.task_count / runtime_seconds:.2f} tasks/second"
                    )
            logger.info(f"   Asana task: {data['name']}")
            text += data["name"] + "\n\n"  # name is actually the title
            if data["notes"]:
                text += data["notes"] + "\n\n"
            if data["created_by"] and data["created_by"]["gid"]:
                text += (
                    "This issue was created by "
                    + self.get_user(data["created_by"]["gid"])["name"]
                )
                text += " on " + self.format_date(data["created_at"]) + ".\n"
            if data["due_on"]:
                text += (
                    "This issue is due on " + self.format_date(data["due_on"]) + ".\n"
                )
            if data["completed_at"]:
                text += (
                    "This issue was completed on "
                    + self.format_date(data["completed_at"])
                    + ".\n"
                )
            text += "\n"
            try:
                stories_opts: Dict[str, str] = {}
                story_start = time.time()
                stories = self.stories_api.get_stories_for_task(
                    data["gid"], stories_opts
                )
                story_count = 0
                story_comment_count = 0
                for story in stories:
                    story_count += 1
                    if story["resource_subtype"] == "comment_added":
                        comment = self.stories_api.get_story(
                            story["gid"],
                            opts={"opt_fields": "text,created_by,created_at"},
                        )
                        by_user = self.get_user(comment["created_by"]["gid"])
                        text += (
                            "Comment by "
                            + by_user["name"]
                            + ": "
                            + comment["text"]
                            + "\n\n"
                        )
                        story_comment_count += 1
                logger.info(
                    f"Got {story_count} stories (with {story_comment_count} comments) in "
                    + f"{time.time() - story_start:.2f} seconds"
                )
                text += (
                    "This issue was last modified on "
                    + self.format_date(data["modified_at"])
                    + ".\n"
                )
                last_modified = datetime.fromisoformat(data["modified_at"])
                task = AsanaTask(
                    id=data["gid"],
                    title=data["name"],
                    text=text,
                    link=data["permalink_url"],
                    last_modified=last_modified,
                    project_gid=project_gid,
                    project_name=project["name"],
                )
                yield task
            except Exception:
                logger.error(
                    f"Error getting stories for task {data['gid']} in project {project_gid} "
                    + f"(error count={self.api_error_count})"
                )
                traceback.print_exc()
                self.api_error_count += 1

    def get_user(self, user_gid: str) -> Dict:
        user = self.user_cache.get(user_gid)
        if user:
            return user
        user = self.users_api.get_user(user_gid, {"opt_fields": "name,email"})
        if user:
            self.user_cache[user_gid] = user
        else:
            user = {"name": "Unknown"}
        return user

    def format_date(self, date_str: str) -> str:
        date = datetime.fromisoformat(date_str)
        return time.strftime("%Y-%m-%d", date.timetuple())

    def get_time(self) -> str:
        return time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
