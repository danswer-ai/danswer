'use client';

import {
    FiChevronDown,
    FiChevronUp,
  } from "react-icons/fi";
import { ErrorCallout } from "@/components/ErrorCallout";
import { useState } from "react";
import { ThreeDotsLoader } from "@/components/Loading";
import Link from "next/link";
import { useSlackBotConfigs, useSlackBotTokens } from "@/hooks/admin/bot/useSlackBotHook";
import { usePopup } from "@/components/adminPageComponents/connectors/Popup";
import { SlackBotTokensForm } from "@/components/adminPageComponents/slackbot/SlackBotTokensForm";
import {
    Button,
    Text,
    Title,
  } from "@tremor/react";
import SlackBotConfigsTable from "./SlackBotConfigsTable";



export default function SlackBotConfinguration (){
    const [slackBotTokensModalIsOpen, setSlackBotTokensModalIsOpen] =
      useState(false);
    const { popup, setPopup } = usePopup();
    const {
      data: slackBotConfigs,
      isLoading: isSlackBotConfigsLoading,
      error: slackBotConfigsError,
      refreshSlackBotConfigs,
    } = useSlackBotConfigs();
  
    const { data: slackBotTokens, refreshSlackBotTokens } = useSlackBotTokens();
  
    if (isSlackBotConfigsLoading) {
      return <ThreeDotsLoader />;
    }
  
    if (slackBotConfigsError || !slackBotConfigs || !slackBotConfigs) {
      return (
        <ErrorCallout
          errorTitle="Error loading slack bot configs"
          errorMsg={
            slackBotConfigsError.info?.message ||
            slackBotConfigsError.info?.detail
          }
        />
      );
    }
  
    return (
      <div className="mb-8">
        {popup}
        <Title>Step 1: Configure Slack Tokens</Title>
        {!slackBotTokens ? (
          <div className="mt-3">
            <SlackBotTokensForm
              onClose={() => refreshSlackBotTokens()}
              setPopup={setPopup}
            />
          </div>
        ) : (
          <>
            <Text className="italic mt-3">Tokens saved!</Text>
            <Button
              onClick={() => {
                setSlackBotTokensModalIsOpen(!slackBotTokensModalIsOpen);
              }}
              color="blue"
              size="xs"
              className="mt-2"
              icon={slackBotTokensModalIsOpen ? FiChevronUp : FiChevronDown}
            >
              {slackBotTokensModalIsOpen ? "Hide" : "Edit Tokens"}
            </Button>
            {slackBotTokensModalIsOpen && (
              <div className="mt-3">
                <SlackBotTokensForm
                  onClose={() => {
                    refreshSlackBotTokens();
                    setSlackBotTokensModalIsOpen(false);
                  }}
                  setPopup={setPopup}
                  existingTokens={slackBotTokens}
                />
              </div>
            )}
          </>
        )}
        {slackBotTokens && (
          <>
            <Title className="mb-2 mt-4">Step 2: Setup DanswerBot</Title>
            <Text className="mb-3">
              Configure Danswer to automatically answer questions in Slack
              channels. By default, Danswer only responds in channels where a
              configuration is setup unless it is explicitly tagged.
            </Text>
  
            <div className="mb-2"></div>
  
            <Link className="flex mb-3" href="/admin/bot/new">
              <Button className="my-auto" color="green" size="xs">
                New Slack Bot Configuration
              </Button>
            </Link>
  
            {slackBotConfigs.length > 0 && (
              <div className="mt-8">
                <SlackBotConfigsTable
                  slackBotConfigs={slackBotConfigs}
                  refresh={refreshSlackBotConfigs}
                  setPopup={setPopup}
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  };