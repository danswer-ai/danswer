"use client";

import { ThreeDotsLoader } from "@/components/Loading";
import { PageSelector } from "@/components/PageSelector";
import { InfoIcon } from "@/components/icons/icons";

import { useConnectorCredentialIndexingStatus } from "@/lib/hooks";
import { ConnectorIndexingStatus, DocumentSet } from "@/lib/types";
import { useState } from "react";
import { ConnectorTitle } from "@/components/admin/connectors/ConnectorTitle";
import { DeleteButton } from "@/components/DeleteButton";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Bookmark,
  CircleCheckBig,
  Clock,
  Pencil,
  TriangleAlert,
} from "lucide-react";
import { CustomTooltip } from "@/components/CustomTooltip";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { deleteDocumentSet } from "@/app/admin/documents/sets/lib";
import { useDocumentSets } from "@/app/admin/documents/sets/hooks";
import { DeleteModal } from "@/components/DeleteModal";

const numToDisplay = 50;

const EditRow = ({
  documentSet,
  isEditable,
  teamspaceId,
}: {
  documentSet: DocumentSet;
  isEditable: boolean;
  teamspaceId?: string | string[];
}) => {
  const router = useRouter();

  if (!isEditable) {
    return (
      <div className="p-1 my-auto font-medium text-emphasis">
        {documentSet.name}
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {documentSet.is_up_to_date ? (
        <CustomTooltip
          trigger={
            <div
              className="flex items-center w-full gap-2 cursor-pointer"
              onClick={() => {
                if (documentSet.is_up_to_date) {
                  router.push(
                    teamspaceId
                      ? `/t/${teamspaceId}/admin/documents/sets/${documentSet.id}`
                      : `/admin/documents/sets/${documentSet.id}`
                  );
                }
              }}
            >
              <Pencil size={16} className="shrink-0" />
              <p className="truncate">{documentSet.name}</p>
            </div>
          }
        >
          {documentSet.name}
        </CustomTooltip>
      ) : (
        <CustomTooltip
          trigger={
            <div className="flex items-center w-full gap-2">
              <Pencil size={16} className="shrink-0" />
              <p className="truncate">{documentSet.name}</p>
            </div>
          }
        >
          <div className="flex gap-1.5">
            <InfoIcon className="mb-auto shrink-0 mt-[3px]" /> Cannot update
            while syncing. Wait for the sync to finish, then try again.
          </div>
        </CustomTooltip>
      )}
    </div>
  );
};

interface DocumentFeedbackTableProps {
  documentSets: DocumentSet[];
  ccPairs: ConnectorIndexingStatus<any, any>[];
  refresh: () => void;
  refreshEditable: () => void;
  editableDocumentSets: DocumentSet[];
  teamspaceId: string | string[] | undefined;
}

const DocumentSetTable = ({
  documentSets,
  editableDocumentSets,
  refresh,
  refreshEditable,
  teamspaceId,
}: DocumentFeedbackTableProps) => {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [documentSetToDelete, setDocumentSetToDelete] =
    useState<DocumentSet | null>(null);

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

  const sortedDocumentSets = [
    ...editableDocumentSets,
    ...documentSets.filter(
      (ds) => !editableDocumentSets.some((eds) => eds.id === ds.id)
    ),
  ];

  return (
    <div>
      {isDeleteModalOpen && documentSetToDelete && (
        <DeleteModal
          title="Are you sure you want to remove this document set?"
          description="This action will remove the selected document set on this teamspace."
          onClose={() => setIsDeleteModalOpen(false)}
          open={isDeleteModalOpen}
          onSuccess={async () => {
            const response = await deleteDocumentSet(
              documentSetToDelete.id,
              teamspaceId
            );
            if (response.ok) {
              toast({
                title: "Deletion Scheduled",
                description: `Document set "${documentSetToDelete.name}" scheduled for deletion.`,
                variant: "success",
              });
              setIsDeleteModalOpen(false);
            } else {
              const errorMsg = (await response.json()).detail;
              toast({
                title: "Deletion Failed",
                description: `Failed to schedule document set for deletion - ${errorMsg}`,
                variant: "destructive",
              });
            }
            refresh();
            refreshEditable();
          }}
        />
      )}

      <h3 className="pb-4">Existing Document Sets</h3>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="h-12">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Data Sources</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Public</TableHead>
                <TableHead>Delete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDocumentSets
                .slice((page - 1) * numToDisplay, page * numToDisplay)
                .map((documentSet) => {
                  const isEditable = editableDocumentSets.some(
                    (eds) => eds.id === documentSet.id
                  );
                  return (
                    <TableRow key={documentSet.id}>
                      <TableCell>
                        <div className="flex w-full gap-x-1 text-emphasis">
                          <EditRow
                            documentSet={documentSet}
                            isEditable={isEditable}
                            teamspaceId={teamspaceId}
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
                          <Badge
                            variant="success"
                            className="whitespace-nowrap"
                          >
                            <CircleCheckBig size={14} /> Up to Date
                          </Badge>
                        ) : documentSet.cc_pair_descriptors.length > 0 ? (
                          <Badge variant="outline">
                            <Clock size={14} /> Syncing
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <TriangleAlert size={14} /> Deleting
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {documentSet.is_public ? (
                          <Badge>Global</Badge>
                        ) : (
                          <Badge variant="secondary">Private</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditable ? (
                          <DeleteButton
                            onClick={() => {
                              setDocumentSetToDelete(documentSet);
                              setIsDeleteModalOpen(true);
                            }}
                          />
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="flex pt-6">
        <div className="mx-auto">
          <PageSelector
            totalPages={Math.ceil(sortedDocumentSets.length / numToDisplay)}
            currentPage={page}
            onPageChange={(newPage) => setPage(newPage)}
          />
        </div>
      </div>
    </div>
  );
};

export const Main = ({ teamspaceId }: { teamspaceId?: string | string[] }) => {
  const {
    data: documentSets,
    isLoading: isDocumentSetsLoading,
    error: documentSetsError,
    refreshDocumentSets,
  } = useDocumentSets(false, teamspaceId);
  const {
    data: editableDocumentSets,
    isLoading: isEditableDocumentSetsLoading,
    error: editableDocumentSetsError,
    refreshDocumentSets: refreshEditableDocumentSets,
  } = useDocumentSets(true, teamspaceId);

  const {
    data: ccPairs,
    isLoading: isCCPairsLoading,
    error: ccPairsError,
  } = useConnectorCredentialIndexingStatus(undefined, false, teamspaceId);

  if (
    isDocumentSetsLoading ||
    isCCPairsLoading ||
    isEditableDocumentSetsLoading
  ) {
    return <ThreeDotsLoader />;
  }

  if (documentSetsError || !documentSets) {
    return <div>Error: {documentSetsError}</div>;
  }

  if (editableDocumentSetsError || !editableDocumentSets) {
    return <div>Error: {editableDocumentSetsError}</div>;
  }

  if (ccPairsError || !ccPairs) {
    return <div>Error: {ccPairsError}</div>;
  }

  return (
    <div>
      <p className="pb-6">
        <b>Document Sets</b> allow you to group logically connected documents
        into a single bundle. These can then be used as filter when performing
        searches in the web UI to limit the amount of information the bot
        searches over when answering in a specific channel or with a certain
        command.
      </p>

      <div className="flex pb-6">
        <Link
          href={
            teamspaceId
              ? `/t/${teamspaceId}/admin/documents/sets/new`
              : `/admin/documents/sets/new`
          }
        >
          <Button className="my-auto">New Document Set</Button>
        </Link>
      </div>

      {documentSets.length > 0 && (
        <>
          <DocumentSetTable
            documentSets={documentSets}
            editableDocumentSets={editableDocumentSets}
            ccPairs={ccPairs}
            refresh={refreshDocumentSets}
            refreshEditable={refreshEditableDocumentSets}
            teamspaceId={teamspaceId}
          />
        </>
      )}
    </div>
  );
};
