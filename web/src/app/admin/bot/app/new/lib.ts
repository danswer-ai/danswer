interface SlackAppCreationRequest {
  name: string;
  description: string;
  enabled: boolean;

  bot_token: string;
  app_token: string;
}

const buildRequestBodyFromCreationRequest = (
  creationRequest: SlackAppCreationRequest
) => {
  return JSON.stringify({
    name: creationRequest.name,
    description: creationRequest.description,
    enabled: creationRequest.enabled,
    bot_token: creationRequest.bot_token,
    app_token: creationRequest.app_token,
  });
};

export const createSlackApp = async (
  creationRequest: SlackAppCreationRequest
) => {
  return fetch("/api/manage/admin/slack-bot/apps", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: buildRequestBodyFromCreationRequest(creationRequest),
  });
};

export const updateSlackApp = async (
  id: number,
  creationRequest: SlackAppCreationRequest
) => {
  return fetch(`/api/manage/admin/slack-bot/apps/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: buildRequestBodyFromCreationRequest(creationRequest),
  });
};

export const deleteSlackApp = async (id: number) => {
  return fetch(`/api/manage/admin/slack-bot/config/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
};
