"use client";

import useSWR, { useSWRConfig } from "swr";

import { BasicTable } from "@/components/admin/connectors/BasicTable";
import { WebIndexForm } from "@/components/admin/connectors/WebIndexForm";
import { BACKEND_URL } from "@/lib/constants";

interface WebsiteIndexAttempt {
  url: string;
  status: string;
  time_created: string;
}

interface ListWebIndexingResponse {
  index_attempts: WebsiteIndexAttempt[];
}

const listWebIndexingHistory = async (): Promise<ListWebIndexingResponse> => {
  const response = await fetch(BACKEND_URL + "/admin/website_index", {
    headers: { "Content-Type": "application/json" },
  });
  return response.json();
};

const COLUMNS = [
  { header: "Base URL", key: "url" },
  { header: "Created At", key: "time_created" },
  { header: "Status", key: "status" },
];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Web() {
  const { mutate } = useSWRConfig();
  const { data: indexingHistory } = useSWR<ListWebIndexingResponse>(
    BACKEND_URL + "/admin/website_index",
    fetcher
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="border-solid border-slate-600 border-b mb-4">
        <h1 className="text-3xl font-bold mb-2 pl-2">Web</h1>
      </div>
      <h2 className="text-xl font-bold pl-2 mb-2 mt-6 ml-auto mr-auto">
        Index Website
      </h2>
      <div className="border-solid border-slate-600 border rounded-md p-6">
        <WebIndexForm
          onSubmit={(success) => {
            if (success) {
              mutate(BACKEND_URL + "/admin/website_index");
            }
          }}
        />
      </div>

      <h2 className="text-xl font-bold pl-2 mb-2 mt-6 ml-auto mr-auto">
        Website Index History
      </h2>
      <BasicTable
        columns={COLUMNS}
        data={
          indexingHistory
            ? indexingHistory.index_attempts.map((indexAttempt) => ({
                ...indexAttempt,
                url: (
                  <a
                    className="text-blue-500"
                    target="_blank"
                    href={indexAttempt.url}
                  >
                    {indexAttempt.url}
                  </a>
                ),
              }))
            : []
        }
      />
    </div>
  );
}
