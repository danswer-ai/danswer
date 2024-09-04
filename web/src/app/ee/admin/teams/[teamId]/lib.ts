import { TeamspaceUpdate } from "../types";

export const updateTeamspace = async (
  teamId: number,
  teamspace: TeamspaceUpdate
) => {
  const url = `/api/manage/admin/teamspace/${teamId}`;
  return await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(teamspace),
  });
};
