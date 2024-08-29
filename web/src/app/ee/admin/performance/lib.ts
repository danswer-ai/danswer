import { errorHandlingFetcher } from "@/lib/fetcher";
import useSWR, { mutate } from "swr";
import {
  ChatSessionMinimal,
  QueryAnalytics,
  UserAnalytics,
} from "./usage/types";
import { useState } from "react";
import { buildApiPath } from "@/lib/urlBuilder";
import { Feedback } from "@/lib/types";
import { DateRangePickerValue } from "@tremor/react";
import {
  convertDateToEndOfDay,
  convertDateToStartOfDay,
  getXDaysAgo,
} from "./dateUtils";
import { DateRange } from "react-day-picker";

export const useTimeRange = () => {
  return useState<DateRange>({
    to: new Date(),
    from: getXDaysAgo(30),
  });
};

export const useQueryAnalytics = (timeRange: DateRange) => {
  const url = buildApiPath("/api/analytics/admin/query", {
    start: convertDateToStartOfDay(timeRange.from)?.toISOString(),
    end: convertDateToEndOfDay(timeRange.to)?.toISOString(),
  });
  const swrResponse = useSWR<QueryAnalytics[]>(url, errorHandlingFetcher);

  return {
    ...swrResponse,
    refreshQueryAnalytics: () => mutate(url),
  };
};

export const useUserAnalytics = (timeRange: DateRange) => {
  const url = buildApiPath("/api/analytics/admin/user", {
    start: convertDateToStartOfDay(timeRange.from)?.toISOString(),
    end: convertDateToEndOfDay(timeRange.to)?.toISOString(),
  });
  const swrResponse = useSWR<UserAnalytics[]>(url, errorHandlingFetcher);

  return {
    ...swrResponse,
    refreshUserAnalytics: () => mutate(url),
  };
};

export const useQueryHistory = () => {
  const [selectedFeedbackType, setSelectedFeedbackType] =
    useState<Feedback | null>(null);
  const [timeRange, setTimeRange] = useTimeRange();

  const url = buildApiPath("/api/admin/chat-session-history", {
    feedback_type: selectedFeedbackType,
    start: convertDateToStartOfDay(timeRange.from)?.toISOString(),
    end: convertDateToEndOfDay(timeRange.to)?.toISOString(),
  });
  const swrResponse = useSWR<ChatSessionMinimal[]>(url, errorHandlingFetcher);

  return {
    ...swrResponse,
    selectedFeedbackType,
    setSelectedFeedbackType: (feedbackType: Feedback | "all") =>
      setSelectedFeedbackType(feedbackType === "all" ? null : feedbackType),
    timeRange,
    setTimeRange,
    refreshQueryHistory: () => mutate(url),
  };
};

export function getDatesList(startDate: Date): string[] {
  const datesList: string[] = [];
  const endDate = new Date(); // current date

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0]; // convert date object to 'YYYY-MM-DD' format
    datesList.push(dateStr);
  }

  return datesList;
}
