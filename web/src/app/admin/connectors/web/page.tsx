"use client";

import useSWR, { useSWRConfig } from "swr";

import { BasicTable } from "@/components/admin/connectors/BasicTable";
import { WebIndexForm } from "@/app/admin/connectors/web/WebIndexForm";
import { ThinkingAnimation } from "@/components/Thinking";
import { timeAgo } from "@/lib/time";
import { GlobeIcon } from "@/components/icons/icons";
import { fetcher } from "@/lib/fetcher";

interface WebsiteIndexAttempt {
  url: string;
  status: "success" | "failure" | "in_progress" | "not_started";
  time_created: string;
  time_updated: string;
  docs_indexed: number;
}

interface ListWebIndexingResponse {
  index_attempts: WebsiteIndexAttempt[];
}

const COLUMNS = [
  { header: "Base URL", key: "url" },
  { header: "Last Indexed", key: "indexed_at" },
  { header: "Docs Indexed", key: "docs_indexed" },
  { header: "Status", key: "status" },
];

export default function Web() {
  const { mutate } = useSWRConfig();
  const { data, isLoading, error } = useSWR<ListWebIndexingResponse>(
    "/api/admin/connectors/web/index-attempt",
    fetcher
  );

  const urlToLatestIndexAttempt = new Map<string, WebsiteIndexAttempt>();
  const urlToLatestIndexSuccess = new Map<string, string>();
  data?.index_attempts.forEach((indexAttempt) => {
    const latestIndexAttempt = urlToLatestIndexAttempt.get(indexAttempt.url);
    if (
      !latestIndexAttempt ||
      indexAttempt.time_created > latestIndexAttempt.time_created
    ) {
      urlToLatestIndexAttempt.set(indexAttempt.url, indexAttempt);
    }

    const latestIndexSuccess = urlToLatestIndexSuccess.get(indexAttempt.url);
    if (
      indexAttempt.status === "success" &&
      (!latestIndexSuccess || indexAttempt.time_updated > latestIndexSuccess)
    ) {
      urlToLatestIndexSuccess.set(indexAttempt.url, indexAttempt.time_updated);
    }
  });

  return (
    <div className="mx-auto">
      <div className="border-solid border-gray-600 border-b pb-2 mb-4 flex">
        <GlobeIcon size="32" />
        <h1 className="text-3xl font-bold pl-2">Web</h1>
      </div>
      <h2 className="text-xl font-bold pl-2 mb-2 mt-6 ml-auto mr-auto">
        Request Indexing
      </h2>
      <div className="border-solid border-gray-600 border rounded-md p-6">
        <WebIndexForm
          onSubmit={(success) => {
            if (success) {
              mutate("/api/admin/connectors/web/index-attempt");
            }
          }}
        />
      </div>

      <h2 className="text-xl font-bold pl-2 mb-2 mt-6 ml-auto mr-auto">
        Indexing History
      </h2>
      {isLoading ? (
        <ThinkingAnimation text="Loading" />
      ) : error ? (
        <div>Error loading indexing history</div>
      ) : (
        <BasicTable
          columns={COLUMNS}
          data={
            urlToLatestIndexAttempt.size > 0
              ? Array.from(urlToLatestIndexAttempt.values()).map(
                  (indexAttempt) => ({
                    ...indexAttempt,
                    indexed_at:
                      timeAgo(urlToLatestIndexSuccess.get(indexAttempt.url)) ||
                      "-",
                    docs_indexed: indexAttempt.docs_indexed || "-",
                    url: (
                      <a
                        className="text-blue-500"
                        target="_blank"
                        href={indexAttempt.url}
                      >
                        {indexAttempt.url}
                      </a>
                    ),
                  })
                )
              : []
          }
        />
      )}
    </div>
  );
}
