"use client";

import { LoadingAnimation, ThreeDotsLoader } from "@/components/Loading";
import { PageSelector } from "@/components/PageSelector";
import { BasicTable } from "@/components/admin/connectors/BasicTable";
import {
  BookmarkIcon,
  EditIcon,
  InfoIcon,
  TrashIcon,
} from "@/components/icons/icons";
import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Title,
  Divider,
  Badge,
} from "@tremor/react";
import { useConnectorCredentialIndexingStatus } from "@/lib/hooks";
import { ConnectorIndexingStatus, DocumentSet } from "@/lib/types";
import { useState } from "react";
import { useDocumentSets } from "./hooks";
import { DocumentSetCreationForm } from "./DocumentSetCreationForm";
import { ConnectorTitle } from "@/components/admin/connectors/ConnectorTitle";
import { deleteDocumentSet } from "./lib";
import { PopupSpec, usePopup } from "@/components/admin/connectors/Popup";
import { AdminPageTitle } from "@/components/admin/Title";
import { Button, Text } from "@tremor/react";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiEdit,
} from "react-icons/fi";
import { DeleteButton } from "@/components/DeleteButton";

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
        <div className="flex flex-nowrap absolute w-64 top-0 left-0 mt-8 border border-border bg-background px-3 py-2 rounded shadow-lg">
          <InfoIcon className="mt-1 flex flex-shrink-0 mr-2" /> Cannot update
          while syncing! Wait for the sync to finish, then try again.
        </div>
      )}
      <div
        className={
          "text-emphasis font-medium my-auto p-1 hover:bg-hover-light flex" +
          (documentSet.is_up_to_date ? " cursor-pointer" : "")
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
        <FiEdit className="text-emphasis mr-1 my-auto" />
        {documentSet.name}
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
      <Title>Existing Document Sets</Title>
      <Table className="overflow-visible mt-2">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Connectors</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Delete</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {documentSets
            .slice((page - 1) * numToDisplay, page * numToDisplay)
            .map((documentSet) => {
              return (
                <TableRow key={documentSet.id}>
                  <TableCell className="whitespace-normal break-all">
                    <div className="flex gap-x-1 text-emphasis">
                      <EditRow
                        documentSet={documentSet}
                        ccPairs={ccPairs}
                        setPopup={setPopup}
                        refreshDocumentSets={refresh}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      {documentSet.cc_pair_descriptors.map(
                        (ccPairDescriptor, ind) => {
                          return (
                            <div
                              className={
                                ind !==
                                documentSet.cc_pair_descriptors.length - 1
                                  ? "mb-3"
                                  : ""
                              }
                              key={ccPairDescriptor.id}
                            >
                              <ConnectorTitle
                                connector={ccPairDescriptor.connector}
                                ccPairName={ccPairDescriptor.name}
                                ccPairId={ccPairDescriptor.id}
                                showMetadata={false}
                              />
                            </div>
                          );
                        }
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {documentSet.is_up_to_date ? (
                      <Badge size="md" color="green" icon={FiCheckCircle}>
                        Up to Date
                      </Badge>
                    ) : documentSet.cc_pair_descriptors.length > 0 ? (
                      <Badge size="md" color="amber" icon={FiClock}>
                        Syncing
                      </Badge>
                    ) : (
                      <Badge size="md" color="red" icon={FiAlertTriangle}>
                        Deleting
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DeleteButton
                      onClick={async () => {
                        const response = await deleteDocumentSet(
                          documentSet.id
                        );
                        if (response.ok) {
                          setPopup({
                            message: `Document set "${documentSet.name}" scheduled for deletion`,
                            type: "success",
                          });
                        } else {
                          const errorMsg = (await response.json()).detail;
                          setPopup({
                            message: `Failed to schedule document set for deletion - ${errorMsg}`,
                            type: "error",
                          });
                        }
                        refresh();
                      }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>

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
      <Text className="mb-3">
        <b>Document Sets</b> allow you to group logically connected documents
        into a single bundle. These can then be used as filter when performing
        searches in the web UI or attached to slack bots to limit the amount of
        information the bot searches over when answering in a specific channel
        or with a certain command.
      </Text>

      <div className="mb-3"></div>

      <div className="flex mb-6">
        <Button
          size="xs"
          color="green"
          className="ml-2 my-auto"
          onClick={() => setIsOpen(true)}
        >
          New Document Set
        </Button>
      </div>

      {documentSets.length > 0 && (
        <>
          <Divider />
          <DocumentSetTable
            documentSets={documentSets}
            ccPairs={ccPairs}
            refresh={refreshDocumentSets}
            setPopup={setPopup}
          />
        </>
      )}

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
    <div className="container mx-auto">
      <AdminPageTitle icon={<BookmarkIcon size={32} />} title="Document Sets" />

      <Main />
    </div>
  );
};

export default Page;
