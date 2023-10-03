"use client";

import { Button } from "@/components/Button";
import { ThreeDotsLoader } from "@/components/Loading";
import { PageSelector } from "@/components/PageSelector";
import { BasicTable } from "@/components/admin/connectors/BasicTable";
import { CPUIcon, EditIcon, TrashIcon } from "@/components/icons/icons";
import { DocumentSet, SlackBotConfig } from "@/lib/types";
import { useState } from "react";
import { useSlackBotConfigs, useSlackBotTokens } from "./hooks";
import { PopupSpec, usePopup } from "@/components/admin/connectors/Popup";
import { SlackBotCreationForm } from "./SlackBotConfigCreationForm";
import { deleteSlackBotConfig } from "./lib";
import { SlackBotTokensForm } from "./SlackBotTokensForm";
import { useDocumentSets } from "../documents/sets/hooks";

const numToDisplay = 50;

const EditRow = ({
  existingSlackBotConfig,
  setPopup,
  documentSets,
  refreshSlackBotConfigs,
}: {
  existingSlackBotConfig: SlackBotConfig;
  setPopup: (popupSpec: PopupSpec | null) => void;
  documentSets: DocumentSet[];
  refreshSlackBotConfigs: () => void;
}) => {
  const [isEditPopupOpen, setEditPopupOpen] = useState(false);
  return (
    <>
      {isEditPopupOpen && (
        <SlackBotCreationForm
          onClose={() => {
            setEditPopupOpen(false);
            refreshSlackBotConfigs();
          }}
          setPopup={setPopup}
          documentSets={documentSets}
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
  documentSets: DocumentSet[];
  refresh: () => void;
  setPopup: (popupSpec: PopupSpec | null) => void;
}

const SlackBotConfigsTable = ({
  slackBotConfigs,
  documentSets,
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
            header: "Document Sets",
            key: "document_sets",
          },
          {
            header: "Team Members",
            key: "team_members",
          },
          {
            header: "Hide Non-Answers",
            key: "answer_validity_check_enabled",
          },
          {
            header: "Questions Only",
            key: "question_mark_only",
          },
          {
            header: "Tags Only",
            key: "respond_tag_only",
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
                    refreshSlackBotConfigs={refresh}
                    documentSets={documentSets}
                  />
                  <div className="my-auto">
                    {slackBotConfig.channel_config.channel_names
                      .map((channel_name) => `#${channel_name}`)
                      .join(", ")}
                  </div>
                </div>
              ),
              document_sets: (
                <div>
                  {slackBotConfig.document_sets
                    .map((documentSet) => documentSet.name)
                    .join(", ")}
                </div>
              ),
              team_members: (
                <div>
                  {(
                    slackBotConfig.channel_config.respond_team_member_list || []
                  ).join(", ")}
                </div>
              ),
              answer_validity_check_enabled: (
                slackBotConfig.channel_config.answer_filters || []
              ).includes("well_answered_postfilter") ? (
                <div className="text-gray-300">Yes</div>
              ) : (
                <div className="text-gray-300">No</div>
              ),
              question_mark_only: (
                slackBotConfig.channel_config.answer_filters || []
              ).includes("questionmark_prefilter") ? (
                <div className="text-gray-300">Yes</div>
              ) : (
                <div className="text-gray-300">No</div>
              ),
              respond_tag_only:
                slackBotConfig.channel_config.respond_tag_only || false ? (
                  <div className="text-gray-300">Yes</div>
                ) : (
                  <div className="text-gray-300">No</div>
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
  const {
    data: documentSets,
    isLoading: isDocumentSetsLoading,
    error: documentSetsError,
  } = useDocumentSets();

  const { data: slackBotTokens, refreshSlackBotTokens } = useSlackBotTokens();

  if (isSlackBotConfigsLoading || isDocumentSetsLoading) {
    return <ThreeDotsLoader />;
  }

  if (slackBotConfigsError || !slackBotConfigs) {
    return <div>Error: {slackBotConfigsError}</div>;
  }

  if (documentSetsError || !documentSets) {
    return <div>Error: {documentSetsError}</div>;
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
            documentSets={documentSets}
            refresh={refreshSlackBotConfigs}
            setPopup={setPopup}
          />

          {slackBotConfigModalIsOpen && (
            <SlackBotCreationForm
              documentSets={documentSets}
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
        <CPUIcon size={32} />
        <h1 className="text-3xl font-bold pl-2">Slack Bot Configuration</h1>
      </div>

      <Main />
    </div>
  );
};

export default Page;
