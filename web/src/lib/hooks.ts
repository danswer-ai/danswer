import { Credential } from "@/lib/types";
import useSWR, { useSWRConfig } from "swr";
import { fetcher } from "./fetcher";

const CREDENTIAL_URL = "/api/manage/admin/credential";

export const usePublicCredentials = () => {
  const { mutate } = useSWRConfig();
  const swrResponse = useSWR<Credential<any>[]>(CREDENTIAL_URL, fetcher);

  return {
    ...swrResponse,
    refreshCredentials: () => mutate(CREDENTIAL_URL),
  };
};
