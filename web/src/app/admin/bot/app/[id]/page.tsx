"use client";

import { use } from "react";
import { BackButton } from "@/components/BackButton";
import { ErrorCallout } from "@/components/ErrorCallout";
import { ThreeDotsLoader } from "@/components/Loading";
import { InstantSSRAutoRefresh } from "@/components/SSRAutoRefresh";
import { usePopup } from "@/components/admin/connectors/Popup";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SlackBotConfigsTable } from "../../SlackBotConfigsTable";
import { useSlackApp, useSlackBotConfigsByApp } from "../../hooks";
import { SlackAppCreationForm } from "../SlackAppCreationForm";

function SlackAppEditPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap the params promise
  const unwrappedParams = use(params);
  const { popup, setPopup } = usePopup();

  const {
    data: slackApp,
    isLoading: isSlackAppLoading,
    error: slackAppError,
    refreshSlackApp,
  } = useSlackApp(Number(unwrappedParams.id));

  const {
    data: slackAppConfigs,
    isLoading: isSlackAppConfigsLoading,
    error: slackAppConfigsError,
    refreshSlackAppConfigs,
  } = useSlackBotConfigsByApp(Number(unwrappedParams.id));

  if (isSlackAppLoading || isSlackAppConfigsLoading) {
    return <ThreeDotsLoader />;
  }

  if (slackAppError || !slackApp) {
    const errorMsg =
      slackAppError?.info?.message ||
      slackAppError?.info?.detail ||
      "An unknown error occurred";
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={`Failed to fetch slack app ${unwrappedParams.id}: ${errorMsg}`}
      />
    );
  }

  if (slackAppConfigsError || !slackAppConfigs) {
    const errorMsg =
      slackAppConfigsError?.info?.message ||
      slackAppConfigsError?.info?.detail ||
      "An unknown error occurred";
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={`Failed to fetch slack app ${unwrappedParams.id}: ${errorMsg}`}
      />
    );
  }

  return (
    <div className="container mx-auto">
      <InstantSSRAutoRefresh />

      <BackButton routerOverride="/admin/bot" />

      <SlackAppCreationForm
        existingSlackApp={slackApp}
        refreshSlackApp={refreshSlackApp}
      />

      <div className="my-8" />

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          Slack Bot Configurations
        </h2>

        <Link href={`/admin/bot/new?app_id=${unwrappedParams.id}`}>
          <Button variant="success-reverse" size="sm">
            New Slack Bot Configuration
          </Button>
        </Link>
      </div>

      <div className="mt-8">
        <SlackBotConfigsTable
          slackBotConfigs={slackAppConfigs}
          refresh={refreshSlackAppConfigs}
          setPopup={setPopup}
        />
      </div>
    </div>
  );
}

export default SlackAppEditPage;
