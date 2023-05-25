"use client";

import useSWR from "swr";
import * as Yup from "yup";

import { BasicTable } from "@/components/admin/connectors/BasicTable";
import { LoadingAnimation } from "@/components/Loading";
import { timeAgo } from "@/lib/time";
import { GlobeIcon } from "@/components/icons/icons";
import { fetcher } from "@/lib/fetcher";
import {
  IndexAttempt,
  ListIndexingResponse,
} from "../../../../components/admin/connectors/types";
import { IndexForm } from "@/components/admin/connectors/IndexForm";
import { TextFormField } from "@/components/admin/connectors/Field";
import { useRouter } from "next/navigation";
import { HealthCheckBanner } from "@/components/health/healthcheck";

const COLUMNS = [
  { header: "Base URL", key: "url" },
  { header: "Last Indexed", key: "indexed_at" },
  { header: "Docs Indexed", key: "docs_indexed" },
  { header: "Status", key: "status" },
];

export default function Web() {
  const router = useRouter();

  const { data, isLoading, error } = useSWR<ListIndexingResponse>(
    "/api/admin/connector/web/index-attempt",
    fetcher
  );

  const urlToLatestIndexAttempt = new Map<string, IndexAttempt>();
  const urlToLatestIndexSuccess = new Map<string, string>();
  data?.index_attempts?.forEach((indexAttempt) => {
    const url = indexAttempt.connector_specific_config.base_url;
    const latestIndexAttempt = urlToLatestIndexAttempt.get(url);
    if (
      !latestIndexAttempt ||
      indexAttempt.time_created > latestIndexAttempt.time_created
    ) {
      urlToLatestIndexAttempt.set(url, indexAttempt);
    }

    const latestIndexSuccess = urlToLatestIndexSuccess.get(url);
    if (
      indexAttempt.status === "success" &&
      (!latestIndexSuccess || indexAttempt.time_updated > latestIndexSuccess)
    ) {
      urlToLatestIndexSuccess.set(url, indexAttempt.time_updated);
    }
  });

  return (
    <div className="mx-auto">
      <div className="mb-4">
        <HealthCheckBanner />
      </div>
      <div className="border-solid border-gray-600 border-b pb-2 mb-4 flex">
        <GlobeIcon size="32" />
        <h1 className="text-3xl font-bold pl-2">Web</h1>
      </div>
      <h2 className="text-xl font-bold pl-2 mb-2 mt-6 ml-auto mr-auto">
        Request Indexing
      </h2>
      <div className="border-solid border-gray-600 border rounded-md p-6">
        <IndexForm
          source="web"
          formBody={<TextFormField name="base_url" label="URL to Index:" />}
          validationSchema={Yup.object().shape({
            base_url: Yup.string().required(
              "Please enter the website URL to scrape e.g. https://docs.github.com/en/actions"
            ),
          })}
          initialValues={{ base_url: "" }}
          onSubmit={(success) => {
            if (success) {
              router.push("/admin/indexing/status");
            }
          }}
        />
      </div>

      <h2 className="text-xl font-bold pl-2 mb-2 mt-6 ml-auto mr-auto">
        Indexing History
      </h2>
      {isLoading ? (
        <LoadingAnimation text="Loading" />
      ) : error ? (
        <div>Error loading indexing history</div>
      ) : (
        <BasicTable
          columns={COLUMNS}
          data={
            urlToLatestIndexAttempt.size > 0
              ? Array.from(urlToLatestIndexAttempt.values()).map(
                  (indexAttempt) => {
                    const url = indexAttempt.connector_specific_config
                      .base_url as string;
                    return {
                      indexed_at:
                        timeAgo(urlToLatestIndexSuccess.get(url)) || "-",
                      docs_indexed: indexAttempt.docs_indexed || "-",
                      url: (
                        <a className="text-blue-500" target="_blank" href={url}>
                          {url}
                        </a>
                      ),
                      status: indexAttempt.status,
                    };
                  }
                )
              : []
          }
        />
      )}
    </div>
  );
}
