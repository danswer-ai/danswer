"use client";

import { BackButton } from "@/components/BackButton";
import { ErrorCallout } from "@/components/ErrorCallout";
import { ThreeDotsLoader } from "@/components/Loading";
import { InstantSSRAutoRefresh } from "@/components/SSRAutoRefresh";
import { AdminPageTitle } from "@/components/admin/Title";
import { usePopup } from "@/components/admin/connectors/Popup";
import { CPUIcon } from "@/components/icons/icons";
import { Button, Text, Title } from "@tremor/react";
import Link from "next/link";
import { SlackBotConfigsTable } from "../../SlackBotConfigsTable";
import { useSlackApp, useSlackBotConfigsByApp } from "../../hooks";
import { SlackAppCreationForm } from "../SlackAppCreationForm";
import { useEffect } from "react";

function Page({ params }: { params: { id: number } }) {
  const { popup, setPopup } = usePopup();

  const {
    data: slackApp,
    isLoading: isSlackAppLoading,
    error: slackAppError,
    refreshSlackApp,
  } = useSlackApp(params.id);

  const {
    data: slackAppConfigs,
    isLoading: isSlackAppConfigsLoading,
    error: slackAppConfigsError,
    refreshSlackAppConfigs,
  } = useSlackBotConfigsByApp(params.id);

  // this keeps the state of the page current after updating through it
  useEffect(() => {
    if (!isSlackAppLoading && !slackAppError) {
      refreshSlackApp();
    }
  }, [isSlackAppLoading, slackAppError, refreshSlackApp]);

  if (isSlackAppLoading || isSlackAppConfigsLoading) {
    return <ThreeDotsLoader />;
  }

  if (slackAppError || !slackApp) {
    const errorMsg = slackAppError?.info?.message || slackAppError?.info?.detail || 'An unknown error occurred';
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={`Failed to fetch slack app ${params.id}: ${errorMsg}`}
      />
    );
  }

  if (slackAppConfigsError || !slackAppConfigs) {
    const errorMsg = slackAppConfigsError?.info?.message || slackAppConfigsError?.info?.detail || 'An unknown error occurred';
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={`Failed to fetch slack app ${params.id}: ${errorMsg}`}
      />
    );
  }

  return (
    <div className="container mx-auto">
      <InstantSSRAutoRefresh />

      <BackButton />
      <AdminPageTitle
        icon={<CPUIcon size={32} />}
        title="Edit Slack App"
      />

      <Text className="mb-8">
        Edit the Slack App settings below! These settings enable the bot
        to connect to your Slack instance.
      </Text>

      <Title>Slack App Configuration</Title>

      <SlackAppCreationForm
        existingSlackApp={slackApp}
        refreshSlackApp={refreshSlackApp}
      />

      <br />

      <Text className="mb-8">
        The below configurations will determine how
        DanswerBot behaves in the specified channels.
      </Text>

      <Title>Slack Bot Configurations</Title>

      <Link className="flex mb-3" href={`/admin/bot/new?app_id=${params.id}`}>
        <Button className="my-auto" color="green" size="xs">
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

export default Page;
