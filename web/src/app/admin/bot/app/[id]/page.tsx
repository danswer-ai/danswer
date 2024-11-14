"use client";

import { use } from "react";
import { BackButton } from "@/components/BackButton";
import { ErrorCallout } from "@/components/ErrorCallout";
import { ThreeDotsLoader } from "@/components/Loading";
import { InstantSSRAutoRefresh } from "@/components/SSRAutoRefresh";
import { AdminPageTitle } from "@/components/admin/Title";
import { usePopup } from "@/components/admin/connectors/Popup";
import { CPUIcon } from "@/components/icons/icons";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SlackBotConfigsTable } from "../../SlackBotConfigsTable";
import { useSlackApp, useSlackBotConfigsByApp } from "../../hooks";
import { SlackAppCreationForm } from "../SlackAppCreationForm";

function SlackAppEditPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap the params promise
  const unwrappedParams = use(params);
  const { popup, setPopup } = usePopup();
  console.log("params", unwrappedParams);

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

      <BackButton />
      <AdminPageTitle icon={<CPUIcon size={32} />} title="Edit Slack App" />

      <p className="text-muted-foreground mb-8">
        Edit the Slack App settings below! These settings enable the bot to
        connect to your Slack instance.
      </p>

      <h2 className="text-2xl font-semibold tracking-tight mb-4">
        Slack App Configuration
      </h2>

      <SlackAppCreationForm
        existingSlackApp={slackApp}
        refreshSlackApp={refreshSlackApp}
      />

      <div className="my-8" />

      <h2 className="text-2xl font-semibold tracking-tight mb-4">
        Slack Bot Configurations
      </h2>

      <Link
        className="flex mb-3"
        href={`/admin/bot/new?app_id=${unwrappedParams.id}`}
      >
        <Button variant="default" size="sm" className="my-auto">
          New Slack Bot Configuration
        </Button>
      </Link>

      {slackAppConfigs.length > 0 && (
        <div className="mt-8">
          <SlackBotConfigsTable
            slackBotConfigs={slackAppConfigs}
            refresh={refreshSlackAppConfigs}
            setPopup={setPopup}
          />
        </div>
      )}
    </div>
  );
}

export default SlackAppEditPage;
