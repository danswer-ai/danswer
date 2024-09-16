import { errorHandlingFetcher } from "@/lib/fetcher";
import { StandardAnswer } from "@/lib/types";
import useSWR, { mutate } from "swr";

export const useStandardAnswers = () => {
  const url = "/api/manage/admin/standard-answer";
  const swrResponse = useSWR<StandardAnswer[]>(url, errorHandlingFetcher);

  return {
    ...swrResponse,
    refreshStandardAnswers: () => mutate(url),
  };
};
