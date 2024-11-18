import { errorHandlingFetcher } from "@/lib/fetcher";
import { SlackBot, SlackChannelConfig } from "@/lib/types";
import useSWR, { mutate } from "swr";

export const useSlackBotConfigs = () => {
  const url = "/api/manage/admin/slack-bot/config";
  const swrResponse = useSWR<SlackChannelConfig[]>(url, errorHandlingFetcher);

  return {
    ...swrResponse,
    refreshSlackBotConfigs: () => mutate(url),
  };
};

export const useSlackApps = () => {
  const url = "/api/manage/admin/slack-bot/apps";
  const swrResponse = useSWR<SlackBot[]>(url, errorHandlingFetcher);

  return {
    ...swrResponse,
    refreshSlackApps: () => mutate(url),
  };
};

export const useSlackApp = (appId: number) => {
  const url = `/api/manage/admin/slack-bot/apps/${appId}`;
  const swrResponse = useSWR<SlackBot>(url, errorHandlingFetcher);

  return {
    ...swrResponse,
    refreshSlackApp: () => mutate(url),
  };
};

export const useSlackBotConfigsByApp = (appId: number) => {
  const url = `/api/manage/admin/slack-bot/apps/${appId}/config`;
  const swrResponse = useSWR<SlackChannelConfig[]>(url, errorHandlingFetcher);

  return {
    ...swrResponse,
    refreshSlackAppConfigs: () => mutate(url),
  };
};
