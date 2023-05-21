"use client";

import { SlackIcon } from "@/components/icons/icons";
import { fetcher } from "@/lib/fetcher";
import useSWR, { useSWRConfig } from "swr";
import { SlackConfig } from "../../../../components/admin/connectors/types";
import { LoadingAnimation } from "@/components/Loading";
import { InitialSetupForm } from "./InitialSetupForm";
import { useRouter } from "next/navigation";
import { HealthCheckBanner } from "@/components/health/healthcheck";

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
        <LoadingAnimation text="Loading" />
      </div>
    );
  } else if (error || !data) {
    return <div>{`Error loading Slack config - ${error}`}</div>;
  }

  return (
    <div className="mx-auto">
      <h2 className="text-xl font-bold mb-3 ml-auto mr-auto">Config</h2>
      <p className="text-sm mb-4">
        To use the Slack connector, you must first provide a Slack bot token
        corresponding to the Slack App set up in your workspace. For more
        details on setting up the Danswer Slack App, see the{" "}
        <a
          className="text-blue-500"
          href="https://docs.danswer.dev/connectors/slack#setting-up"
        >
          docs
        </a>
        .
      </p>
      <div className="border border-gray-700 rounded-md p-3">
        <InitialSetupForm
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
      <div className="mb-4">
        <HealthCheckBanner />
      </div>
      <div className="border-solid border-gray-600 border-b mb-4 pb-2 flex">
        <SlackIcon size="32" />
        <h1 className="text-3xl font-bold pl-2">Slack</h1>
      </div>
      <MainSection />
    </div>
  );
}
