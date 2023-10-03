import { ChannelConfig, SlackBotTokens } from "@/lib/types";

interface SlackBotConfigCreationRequest {
  document_sets: number[];
  channel_names: string[];
  answer_validity_check_enabled: boolean;
  questionmark_prefilter_enabled: boolean;
  respond_tag_only: boolean;
  respond_team_member_list: string[];
}

const buildFiltersFromCreationRequest = (
  creationRequest: SlackBotConfigCreationRequest
): string[] => {
  const answerFilters = [] as string[];
  if (creationRequest.answer_validity_check_enabled) {
    answerFilters.push("well_answered_postfilter");
  }
  if (creationRequest.questionmark_prefilter_enabled) {
    answerFilters.push("questionmark_prefilter");
  }
  return answerFilters;
};

const buildRequestBodyFromCreationRequest = (
  creationRequest: SlackBotConfigCreationRequest
) => {
  return JSON.stringify({
    channel_names: creationRequest.channel_names,
    respond_tag_only: creationRequest.respond_tag_only,
    respond_team_member_list: creationRequest.respond_team_member_list,
    document_sets: creationRequest.document_sets,
    answer_filters: buildFiltersFromCreationRequest(creationRequest),
  });
};

export const createSlackBotConfig = async (
  creationRequest: SlackBotConfigCreationRequest
) => {
  return fetch("/api/manage/admin/slack-bot/config", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: buildRequestBodyFromCreationRequest(creationRequest),
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
    body: buildRequestBodyFromCreationRequest(creationRequest),
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
