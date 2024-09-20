import { errorHandlingFetcher } from "@/lib/fetcher";
import { StandaronyxCategory, Standaronyx } from "@/lib/types";
import useSWR, { mutate } from "swr";

export const useStandaronyxCategories = () => {
  const url = "/api/manage/admin/standard-answer/category";
  const swrResponse = useSWR<StandaronyxCategory[]>(url, errorHandlingFetcher);

  return {
    ...swrResponse,
    refreshStandaronyxCategories: () => mutate(url),
  };
};

export const useStandaronyxs = () => {
  const url = "/api/manage/admin/standard-answer";
  const swrResponse = useSWR<Standaronyx[]>(url, errorHandlingFetcher);

  return {
    ...swrResponse,
    refreshStandaronyxs: () => mutate(url),
  };
};
