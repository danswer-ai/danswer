"use client";

import { Button } from "@/components/Button";
import { ThreeDotsLoader } from "@/components/Loading";
import { PageSelector } from "@/components/PageSelector";
import { BasicTable } from "@/components/admin/connectors/BasicTable";
import { BookmarkIcon, EditIcon, TrashIcon } from "@/components/icons/icons";
import { useConnectorCredentialIndexingStatus } from "@/lib/hooks";
import { SlackBotConfig } from "@/lib/types";
import { useState } from "react";
import { useSlackBotConfigs, useSlackBotTokens } from "./hooks";
import { PopupSpec, usePopup } from "@/components/admin/connectors/Popup";
import { SlackBotCreationForm } from "./SlackBotConfigCreationForm";
import { deleteSlackBotConfig } from "./lib";
import { SlackBotTokensForm } from "./SlackBotTokensForm";

const numToDisplay = 50;

const EditRow = ({
  existingSlackBotConfig,
  setPopup,
  refreshDocumentSets,
}: {
  existingSlackBotConfig: SlackBotConfig;
  setPopup: (popupSpec: PopupSpec | null) => void;
  refreshDocumentSets: () => void;
}) => {
  const [isEditPopupOpen, setEditPopupOpen] = useState(false);
  return (
    <>
      {isEditPopupOpen && (
        <SlackBotCreationForm
          onClose={() => {
            setEditPopupOpen(false);
            refreshDocumentSets();
          }}
          setPopup={setPopup}
          existingSlackBotConfig={existingSlackBotConfig}
        />
      )}
      <div
        className="cursor-pointer my-auto"
        onClick={() => setEditPopupOpen(true)}
      >
        <EditIcon />
      </div>
    </>
  );
};

interface DocumentFeedbackTableProps {
  slackBotConfigs: SlackBotConfig[];
  refresh: () => void;
  setPopup: (popupSpec: PopupSpec | null) => void;
}

const SlackBotConfigsTable = ({
  slackBotConfigs,
  refresh,
  setPopup,
}: DocumentFeedbackTableProps) => {
  const [page, setPage] = useState(1);

  // sort by name for consistent ordering
  slackBotConfigs.sort((a, b) => {
    if (a.id < b.id) {
      return -1;
    } else if (a.id > b.id) {
      return 1;
    } else {
      return 0;
    }
  });

  return (
    <div>
      <BasicTable
        columns={[
          {
            header: "Channels",
            key: "channels",
          },
          {
            header: "Delete",
            key: "delete",
            width: "50px",
          },
        ]}
        data={slackBotConfigs
          .slice((page - 1) * numToDisplay, page * numToDisplay)
          .map((slackBotConfig) => {
            return {
              channels: (
                <div className="flex gap-x-2">
                  <EditRow
                    existingSlackBotConfig={slackBotConfig}
                    setPopup={setPopup}
                    refreshDocumentSets={refresh}
                  />
                  <div className="my-auto">
                    {slackBotConfig.channel_config.channel_names
                      .map((channel_name) => `#${channel_name}`)
                      .join(", ")}
                  </div>
                </div>
              ),
              delete: (
                <div
                  className="cursor-pointer"
                  onClick={async () => {
                    const response = await deleteSlackBotConfig(
                      slackBotConfig.id
                    );
                    if (response.ok) {
                      setPopup({
                        message: `Slack bot config "${slackBotConfig.id}" deleted`,
                        type: "success",
                      });
                    } else {
                      const errorMsg = await response.text();
                      setPopup({
                        message: `Failed to delete Slack bot config - ${errorMsg}`,
                        type: "error",
                      });
                    }
                    refresh();
                  }}
                >
                  <TrashIcon />
                </div>
              ),
            };
          })}
      />
      <div className="mt-3 flex">
        <div className="mx-auto">
          <PageSelector
            totalPages={Math.ceil(slackBotConfigs.length / numToDisplay)}
            currentPage={page}
            onPageChange={(newPage) => setPage(newPage)}
          />
        </div>
      </div>
    </div>
  );
};

const Main = () => {
  const [slackBotConfigModalIsOpen, setSlackBotConfigModalIsOpen] =
    useState(false);
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

  const {
    data: ccPairs,
    isLoading: isCCPairsLoading,
    error: ccPairsError,
  } = useConnectorCredentialIndexingStatus();

  if (isSlackBotConfigsLoading || isCCPairsLoading) {
    return <ThreeDotsLoader />;
  }

  if (slackBotConfigsError || !slackBotConfigs) {
    return <div>Error: {slackBotConfigsError}</div>;
  }

  if (ccPairsError || !ccPairs) {
    return <div>Error: {ccPairsError}</div>;
  }

  return (
    <div className="mb-8">
      {popup}

      <h2 className="text-lg font-bold mb-2">Step 1: Configure Slack Tokens</h2>
      {!slackBotTokens ? (
        <SlackBotTokensForm
          onClose={() => refreshSlackBotTokens()}
          setPopup={setPopup}
        />
      ) : (
        <>
          <div className="text-sm italic">Tokens saved!</div>
          <Button
            onClick={() => setSlackBotTokensModalIsOpen(true)}
            className="mt-2"
          >
            Edit Tokens
          </Button>
          {slackBotTokensModalIsOpen && (
            <SlackBotTokensForm
              onClose={() => {
                refreshSlackBotTokens();
                setSlackBotTokensModalIsOpen(false);
              }}
              setPopup={setPopup}
              existingTokens={slackBotTokens}
            />
          )}
        </>
      )}
      {slackBotTokens && (
        <>
          <h2 className="text-lg font-bold mb-2 mt-4">
            Step 2: Setup DanswerBot
          </h2>
          <div className="text-sm mb-3">
            Configure Danswer to automatically answer questions in Slack
            channels.
          </div>

          <div className="mb-2"></div>

          <div className="flex mb-3">
            <Button
              className="ml-2 my-auto"
              onClick={() => setSlackBotConfigModalIsOpen(true)}
            >
              New Slack Bot
            </Button>
          </div>

          <SlackBotConfigsTable
            slackBotConfigs={slackBotConfigs}
            refresh={refreshSlackBotConfigs}
            setPopup={setPopup}
          />

          {slackBotConfigModalIsOpen && (
            <SlackBotCreationForm
              onClose={() => {
                refreshSlackBotConfigs();
                setSlackBotConfigModalIsOpen(false);
              }}
              setPopup={setPopup}
            />
          )}
        </>
      )}
    </div>
  );
};

const Page = () => {
  return (
    <div>
      <div className="border-solid border-gray-600 border-b pb-2 mb-4 flex">
        <BookmarkIcon size={32} />
        <h1 className="text-3xl font-bold pl-2">Slack Bot Configuration</h1>
      </div>

      <Main />
    </div>
  );
};

export default Page;
