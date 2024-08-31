import { TeamspaceCreation } from "./types";

export const createTeamspace = async (teamspace: TeamspaceCreation) => {
  return fetch("/api/manage/admin/teamspace", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(teamspace),
  });
};

export const deleteTeamspace = async (teamspaceId: number) => {
  return fetch(`/api/manage/admin/teamspace/${teamspaceId}`, {
    method: "DELETE",
  });
};
