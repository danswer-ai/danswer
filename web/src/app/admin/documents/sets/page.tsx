"use client";

import { Button } from "@/components/Button";
import { LoadingAnimation, ThreeDotsLoader } from "@/components/Loading";
import { PageSelector } from "@/components/PageSelector";
import { BasicTable } from "@/components/admin/connectors/BasicTable";
import {
  BookmarkIcon,
  EditIcon,
  InfoIcon,
  TrashIcon,
} from "@/components/icons/icons";
import { useConnectorCredentialIndexingStatus } from "@/lib/hooks";
import { ConnectorIndexingStatus, DocumentSet } from "@/lib/types";
import { useState } from "react";
import { useDocumentSets } from "./hooks";
import { DocumentSetCreationForm } from "./DocumentSetCreationForm";
import { ConnectorTitle } from "@/components/admin/connectors/ConnectorTitle";
import { deleteDocumentSet } from "./lib";
import { PopupSpec, usePopup } from "@/components/admin/connectors/Popup";

const numToDisplay = 50;

const EditRow = ({
  documentSet,
  ccPairs,
  setPopup,
  refreshDocumentSets,
}: {
  documentSet: DocumentSet;
  ccPairs: ConnectorIndexingStatus<any, any>[];
  setPopup: (popupSpec: PopupSpec | null) => void;
  refreshDocumentSets: () => void;
}) => {
  const [isEditPopupOpen, setEditPopupOpen] = useState(false);
  const [isSyncingTooltipOpen, setIsSyncingTooltipOpen] = useState(false);
  return (
    <div className="relative flex">
      {isEditPopupOpen && (
        <DocumentSetCreationForm
          ccPairs={ccPairs}
          onClose={() => {
            setEditPopupOpen(false);
            refreshDocumentSets();
          }}
          setPopup={setPopup}
          existingDocumentSet={documentSet}
        />
      )}
      {isSyncingTooltipOpen && (
        <div className="flex flex-nowrap absolute w-64 top-0 left-0 mt-8 bg-gray-700 px-3 py-2 rounded shadow-lg">
          <InfoIcon className="mt-1 flex flex-shrink-0 mr-2 text-gray-300" />{" "}
          Cannot update while syncing! Wait for the sync to finish, then try
          again.
        </div>
      )}
      <div
        className={
          "my-auto" + (documentSet.is_up_to_date ? " cursor-pointer" : "")
        }
        onClick={() => {
          if (documentSet.is_up_to_date) {
            setEditPopupOpen(true);
          }
        }}
        onMouseEnter={() => {
          if (!documentSet.is_up_to_date) {
            setIsSyncingTooltipOpen(true);
          }
        }}
        onMouseLeave={() => {
          if (!documentSet.is_up_to_date) {
            setIsSyncingTooltipOpen(false);
          }
        }}
      >
        <EditIcon />
      </div>
    </div>
  );
};

interface DocumentFeedbackTableProps {
  documentSets: DocumentSet[];
  ccPairs: ConnectorIndexingStatus<any, any>[];
  refresh: () => void;
  setPopup: (popupSpec: PopupSpec | null) => void;
}

const DocumentSetTable = ({
  documentSets,
  ccPairs,
  refresh,
  setPopup,
}: DocumentFeedbackTableProps) => {
  const [page, setPage] = useState(1);

  // sort by name for consistent ordering
  documentSets.sort((a, b) => {
    if (a.name < b.name) {
      return -1;
    } else if (a.name > b.name) {
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
            header: "Name",
            key: "name",
          },
          {
            header: "Connectors",
            key: "ccPairs",
          },
          {
            header: "Status",
            key: "status",
          },
          {
            header: "Delete",
            key: "delete",
            width: "50px",
          },
        ]}
        data={documentSets
          .filter((documentSet) => documentSet.cc_pair_descriptors.length > 0)
          .slice((page - 1) * numToDisplay, page * numToDisplay)
          .map((documentSet) => {
            return {
              name: (
                <div className="flex gap-x-2">
                  <EditRow
                    documentSet={documentSet}
                    ccPairs={ccPairs}
                    setPopup={setPopup}
                    refreshDocumentSets={refresh}
                  />{" "}
                  <b className="my-auto">{documentSet.name}</b>
                </div>
              ),
              ccPairs: (
                <div>
                  {documentSet.cc_pair_descriptors.map(
                    (ccPairDescriptor, ind) => {
                      return (
                        <div
                          className={
                            ind !== documentSet.cc_pair_descriptors.length - 1
                              ? "mb-3"
                              : ""
                          }
                          key={ccPairDescriptor.id}
                        >
                          <ConnectorTitle
                            connector={ccPairDescriptor.connector}
                            ccPairName={ccPairDescriptor.name}
                            showMetadata={false}
                          />
                        </div>
                      );
                    }
                  )}
                </div>
              ),
              status: documentSet.is_up_to_date ? (
                <div className="text-emerald-600">Up to date!</div>
              ) : (
                <div className="text-gray-300 w-10">
                  <LoadingAnimation text="Syncing" />
                </div>
              ),
              delete: (
                <div
                  className="cursor-pointer"
                  onClick={async () => {
                    const response = await deleteDocumentSet(documentSet.id);
                    if (response.ok) {
                      setPopup({
                        message: `Document set "${documentSet.name}" deleted`,
                        type: "success",
                      });
                    } else {
                      const errorMsg = (await response.json()).detail;
                      setPopup({
                        message: `Failed to delete document set - ${errorMsg}`,
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
            totalPages={Math.ceil(documentSets.length / numToDisplay)}
            currentPage={page}
            onPageChange={(newPage) => setPage(newPage)}
          />
        </div>
      </div>
    </div>
  );
};

const Main = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { popup, setPopup } = usePopup();
  const {
    data: documentSets,
    isLoading: isDocumentSetsLoading,
    error: documentSetsError,
    refreshDocumentSets,
  } = useDocumentSets();

  const {
    data: ccPairs,
    isLoading: isCCPairsLoading,
    error: ccPairsError,
  } = useConnectorCredentialIndexingStatus();

  if (isDocumentSetsLoading || isCCPairsLoading) {
    return <ThreeDotsLoader />;
  }

  if (documentSetsError || !documentSets) {
    return <div>Error: {documentSetsError}</div>;
  }

  if (ccPairsError || !ccPairs) {
    return <div>Error: {ccPairsError}</div>;
  }

  return (
    <div className="mb-8">
      {popup}
      <div className="text-sm mb-3">
        <b>Document Sets</b> allow you to group logically connected documents
        into a single bundle. These can then be used as filter when performing
        searches in the web UI or attached to slack bots to limit the amount of
        information the bot searches over when answering in a specific channel
        or with a certain command.
      </div>

      <div className="mb-2"></div>

      <div className="flex mb-3">
        <Button className="ml-2 my-auto" onClick={() => setIsOpen(true)}>
          New Document Set
        </Button>
      </div>

      <DocumentSetTable
        documentSets={documentSets}
        ccPairs={ccPairs}
        refresh={refreshDocumentSets}
        setPopup={setPopup}
      />

      {isOpen && (
        <DocumentSetCreationForm
          ccPairs={ccPairs}
          onClose={() => {
            refreshDocumentSets();
            setIsOpen(false);
          }}
          setPopup={setPopup}
        />
      )}
    </div>
  );
};

const Page = () => {
  return (
    <div>
      <div className="border-solid border-gray-600 border-b pb-2 mb-4 flex">
        <BookmarkIcon size={32} />
        <h1 className="text-3xl font-bold pl-2">Document Sets</h1>
      </div>

      <Main />
    </div>
  );
};

export default Page;
