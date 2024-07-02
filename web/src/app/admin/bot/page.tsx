"use client";

import { ErrorCallout } from "@/components/ErrorCallout";
import { ThreeDotsLoader } from "@/components/Loading";
import { InstantSSRAutoRefresh } from "@/components/SSRAutoRefresh";
import { AdminPageTitle } from "@/components/admin/Title";
import { Button, Text } from "@tremor/react";
import Link from "next/link";
import { FiSlack } from "react-icons/fi";
import { SlackAppTable } from "./SlackAppTable";
import { useSlackApps } from "./hooks";

const Main = () => {
  const {
    data: slackApps,
    isLoading: isSlackAppsLoading,
    error: slackAppsError,
    refreshSlackApps,
  } = useSlackApps();

  if (isSlackAppsLoading) {
    return <ThreeDotsLoader />;
  }

  if (slackAppsError || !slackApps) {
    const errorMsg =
      slackAppsError?.info?.message ||
      slackAppsError?.info?.detail ||
      "An unknown error occurred";

    return (
      <ErrorCallout errorTitle="Error loading apps" errorMsg={`${errorMsg}`} />
    );
  }

  return (
    <div className="mb-8">
      {/* {popup} */}

      <Text className="mb-2">
        Setup Slack bots that connect to Danswer. Once setup, you will be able
        to ask questions to Danswer directly from Slack. Additionally, you can:
      </Text>

      <Text className="mb-2">
        <ul className="list-disc mt-2 ml-4">
          <li>
            Setup DanswerBot to automatically answer questions in certain
            channels.
          </li>
          <li>
            Choose which document sets DanswerBot should answer from, depending
            on the channel the question is being asked.
          </li>
          <li>
            Directly message DanswerBot to search just as you would in the web
            UI.
          </li>
        </ul>
      </Text>

      <Text className="mb-6">
        Follow the{" "}
        <a
          className="text-blue-500"
          href="https://docs.danswer.dev/slack_bot_setup"
          target="_blank"
        >
          guide{" "}
        </a>
        found in the Danswer documentation to get started!
      </Text>

      <Link className="flex mb-3" href="/admin/bot/app/new">
        <Button className="my-auto" color="green" size="xs">
          Add Slack App
        </Button>
      </Link>

      <SlackAppTable slackApps={slackApps}></SlackAppTable>
    </div>
  );
};

const Page = () => {
  return (
    <div className="container mx-auto">
      <AdminPageTitle
        icon={<FiSlack size={32} />}
        title="Slack Bot Configuration"
      />
      <InstantSSRAutoRefresh />

      <Main />
    </div>
  );
};

export default Page;
