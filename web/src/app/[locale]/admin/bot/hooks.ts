import { errorHandlingFetcher } from "@/lib/fetcher";
import { SlackBotConfig, SlackBotTokens } from "@/lib/types";
import useSWR, { mutate } from "swr";

export const useSlackBotConfigs = () => {
  const url = "/api/manage/admin/slack-bot/config";
  const swrResponse = useSWR<SlackBotConfig[]>(url, errorHandlingFetcher);

  return {
    ...swrResponse,
    refreshSlackBotConfigs: () => mutate(url),
  };
};

export const useSlackBotTokens = () => {
  const url = "/api/manage/admin/slack-bot/tokens";
  const swrResponse = useSWR<SlackBotTokens>(url, errorHandlingFetcher);

  return {
    ...swrResponse,
    refreshSlackBotTokens: () => mutate(url),
  };
};
