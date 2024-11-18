"use client";

import { ErrorCallout } from "@/components/ErrorCallout";
import { FiPlusSquare } from "react-icons/fi";
import { ThreeDotsLoader } from "@/components/Loading";
import { InstantSSRAutoRefresh } from "@/components/SSRAutoRefresh";
import { AdminPageTitle } from "@/components/admin/Title";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SourceIcon } from "@/components/SourceIcon";
import { SlackAppTable } from "./SlackAppTable";
import { useSlackApps } from "./hooks";

const Main = () => {
  const {
    data: slackApps,
    isLoading: isSlackAppsLoading,
    error: slackAppsError,
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

      <p className="mb-2 text-sm text-muted-foreground">
        Setup Slack bots that connect to Danswer. Once setup, you will be able
        to ask questions to Danswer directly from Slack. Additionally, you can:
      </p>

      <div className="mb-2">
        <ul className="list-disc mt-2 ml-4 text-sm text-muted-foreground">
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
      </div>

      <p className="mb-6 text-sm text-muted-foreground">
        Follow the{" "}
        <a
          className="text-blue-500 hover:underline"
          href="https://docs.danswer.dev/slack_bot_setup"
          target="_blank"
          rel="noopener noreferrer"
        >
          guide{" "}
        </a>
        found in the Danswer documentation to get started!
      </p>

      <Link
        className="
            flex
            py-2
            px-4
            mt-2
            border
            border-border
            h-fit
            cursor-pointer
            hover:bg-hover
            text-sm
            w-40
          "
        href="/admin/bot/app/new"
      >
        <div className="mx-auto flex">
          <FiPlusSquare className="my-auto mr-2" />
          New Slack App
        </div>
      </Link>

      <SlackAppTable slackApps={slackApps} />
    </div>
  );
};

const Page = () => {
  return (
    <div className="container mx-auto">
      <AdminPageTitle
        icon={<SourceIcon iconSize={36} sourceType={"slack"} />}
        title="Slack Apps"
      />
      <InstantSSRAutoRefresh />

      <Main />
    </div>
  );
};

export default Page;
