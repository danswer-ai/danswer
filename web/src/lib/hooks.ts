import { Credential, DocumentBoostStatus } from "@/lib/types";
import useSWR, { mutate, useSWRConfig } from "swr";
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

const MOST_REACTED_DOCS_URL = "/api/manage/doc-boosts";

const buildReactedDocsUrl = (ascending: boolean, limit: number) => {
  return `/api/manage/admin/doc-boosts?ascending=${ascending}&limit=${limit}`;
};

export const useMostReactedToDocuments = () => {
  const swrResponse = useSWR<DocumentBoostStatus[]>(
    buildReactedDocsUrl(true, 100),
    fetcher
  );

  return {
    ...swrResponse,
    refreshDocs: () => mutate(MOST_REACTED_DOCS_URL),
  };
};
