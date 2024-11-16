import { SlackApp } from "@/lib/types";

export async function updateSlackAppName(
  slackApp: SlackApp,
  newName: string
): Promise<Response> {
  return fetch(`/api/manage/admin/slack-bot/apps/${slackApp.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...slackApp,
      name: newName,
    }),
  });
}
