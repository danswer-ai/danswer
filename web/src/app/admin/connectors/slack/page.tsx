"use client";

import {
  ConnectorStatus,
  ReccuringConnectorStatus,
} from "@/components/admin/connectors/RecurringConnectorStatus";
import { SlackForm } from "@/app/admin/connectors/slack/SlackForm";
import { SlackIcon } from "@/components/icons/icons";
import { fetcher } from "@/lib/fetcher";
import useSWR, { useSWRConfig } from "swr";
import { SlackConfig } from "./interfaces";
import { ThinkingAnimation } from "@/components/Thinking";

const MainSection = () => {
  // TODO: add back in once this is ready
  // const { data, isLoading, error } = useSWR<ListSlackIndexingResponse>(
  //   "/api/admin/connectors/web/index-attempt",
  //   fetcher
  // );
  const { mutate } = useSWRConfig();
  const { data, isLoading, error } = useSWR<SlackConfig>(
    "/api/admin/connectors/slack/config",
    fetcher
  );

  if (isLoading) {
    return (
      <div className="mt-16">
        <ThinkingAnimation text="Loading" />
      </div>
    );
  } else if (error || !data) {
    return (
      <div className="mt-16">{`Error loading Slack config - ${error}`}</div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold pl-2 mb-2 mt-6 ml-auto mr-auto">
        Status
      </h2>
      {
        <ReccuringConnectorStatus
          status={
            data.pull_frequency !== 0
              ? ConnectorStatus.Running
              : ConnectorStatus.NotSetup
          }
        />
      }

      <h2 className="text-xl font-bold pl-2 mb-2 mt-6 ml-auto mr-auto">
        Config
      </h2>
      <div className="border-solid border-gray-600 border rounded-md p-6">
        <SlackForm
          existingSlackConfig={data}
          onSubmit={() => mutate("/api/admin/connectors/slack/config")}
        />
      </div>
    </div>
  );
};

export default function Page() {
  return (
    <div className="mx-auto">
      <div className="border-solid border-gray-600 border-b mb-4 pb-2 flex">
        <SlackIcon size="32" />
        <h1 className="text-3xl font-bold pl-2">Slack</h1>
      </div>
      <MainSection />
    </div>
  );
}
