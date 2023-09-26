import { ChannelConfig, SlackBotTokens } from "@/lib/types";

interface SlackBotConfigCreationRequest {
  document_sets: number[];
  channel_names: string[];
  answer_validity_check_enabled: boolean;
}

export const createSlackBotConfig = async (
  creationRequest: SlackBotConfigCreationRequest
) => {
  return fetch("/api/manage/admin/slack-bot/config", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(creationRequest),
  });
};

export const updateSlackBotConfig = async (
  id: number,
  creationRequest: SlackBotConfigCreationRequest
) => {
  return fetch(`/api/manage/admin/slack-bot/config/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(creationRequest),
  });
};

export const deleteSlackBotConfig = async (id: number) => {
  return fetch(`/api/manage/admin/slack-bot/config/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export const setSlackBotTokens = async (slackBotTokens: SlackBotTokens) => {
  return fetch(`/api/manage/admin/slack-bot/tokens`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(slackBotTokens),
  });
};
