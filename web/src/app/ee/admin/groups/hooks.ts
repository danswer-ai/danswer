import useSWR, { mutate } from "swr";
import { UserGroup } from "./types";
import { errorHandlingFetcher } from "@/lib/fetcher";

const USER_GROUP_URL = "/api/manage/admin/user-group";

export const useUserGroups = () => {
  const swrResponse = useSWR<UserGroup[]>(USER_GROUP_URL, errorHandlingFetcher);

  return {
    ...swrResponse,
    refreshUserGroups: () => mutate(USER_GROUP_URL),
  };
};
