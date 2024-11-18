import { SlackBot } from "@/lib/types";

export async function updateSlackAppField(
  slackApp: SlackBot,
  field: keyof SlackBot,
  value: any
): Promise<Response> {
  return fetch(`/api/manage/admin/slack-bot/apps/${slackApp.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...slackApp,
      [field]: value,
    }),
  });
}
