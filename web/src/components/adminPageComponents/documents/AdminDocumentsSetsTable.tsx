"use client";

import { PageSelector } from "@/components/PageSelector";
import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Title,
  Badge,
} from "@tremor/react";
import { ConnectorIndexingStatus, DocumentSet } from "@/lib/types";
import { useState } from "react";
import { ConnectorTitle } from "@/components/adminPageComponents/connectors/ConnectorTitle";
import { deleteDocumentSet } from "@/lib/documents/sets/helpers";
import { PopupSpec } from "@/components/adminPageComponents/connectors/Popup";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
} from "react-icons/fi";
import { DeleteButton } from "@/components/DeleteButton";
import EditRow from "./AdminDocumentsSetsEditRow";

const numToDisplay = 50;

interface DocumentFeedbackTableProps {
    documentSets: DocumentSet[];
    ccPairs: ConnectorIndexingStatus<any, any>[];
    refresh: () => void;
    setPopup: (popupSpec: PopupSpec | null) => void;
  }  

export default function DocumentSetTable ({
    documentSets,
    refresh,
    setPopup,
  }: DocumentFeedbackTableProps) {
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
                        <EditRow documentSet={documentSet} />
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