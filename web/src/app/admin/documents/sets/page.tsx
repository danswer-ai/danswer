/* "use client";

import { ThreeDotsLoader } from "@/components/Loading";
import { PageSelector } from "@/components/PageSelector";
import { BookmarkIcon, InfoIcon } from "@/components/icons/icons";
import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
} from "@tremor/react";
import { useConnectorCredentialIndexingStatus } from "@/lib/hooks";
import { ConnectorIndexingStatus, DocumentSet } from "@/lib/types";
import { useState } from "react";
import { useDocumentSets } from "./hooks";
import { ConnectorTitle } from "@/components/admin/connectors/ConnectorTitle";
import { deleteDocumentSet } from "./lib";
import { PopupSpec, usePopup } from "@/components/admin/connectors/Popup";
import { AdminPageTitle } from "@/components/admin/Title";
import { DeleteButton } from "@/components/DeleteButton";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

const numToDisplay = 50;

const EditRow = ({ documentSet }: { documentSet: DocumentSet }) => {
  const router = useRouter();

  return (
    <div className="relative flex">
      <CustomTooltip
        trigger={
          <Button
            variant="ghost"
            className={
              documentSet.is_up_to_date ? "cursor-pointer" : " cursor-default"
            }
            onClick={() => {
              if (documentSet.is_up_to_date) {
                router.push(`/admin/documents/sets/${documentSet.id}`);
              }
            }}
          >
            <Pencil size={16} className="my-auto mr-1 " />
            {documentSet.name}
          </Button>
        }
      >
        <div>
          <InfoIcon className="flex flex-shrink-0 mt-1 mr-2" /> Cannot update
          while syncing! Wait for the sync to finish, then try again.
        </div>
      </CustomTooltip>
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
      <h3 className="font-medium pb-5">Existing Document Sets</h3>
      <Table className="mt-2 overflow-visible">
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
                  <TableCell className="break-all whitespace-normal">
                    <div className="flex gap-x-1 ">
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
                      <Badge variant="success">
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

      <div className="flex mt-3">
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
    <div>
      {popup}
      <p className="pb-6">
        <b>Document Sets</b> allow you to group logically connected documents
        into a single bundle. These can then be used as filter when performing
        searches in the web UI to limit the amount of information the bot
        searches over when answering in a specific channel or with a certain
        command.
      </p>

      <div className="flex pb-6">
        <Link href="/admin/documents/sets/new">
          <Button className="my-auto">New Document Set</Button>
        </Link>
      </div>

      {documentSets.length > 0 && (
        <>
          <DocumentSetTable
            documentSets={documentSets}
            ccPairs={ccPairs}
            refresh={refreshDocumentSets}
            setPopup={setPopup}
          />
        </>
      )}
    </div>
  );
};

const Page = () => {
  return (
    <div className="container mx-auto">
      <AdminPageTitle icon={<Bookmark size={32} />} title="Document Sets" />

      <Main />
    </div>
  );
};

export default Page; */

"use client";

import { ThreeDotsLoader } from "@/components/Loading";
import { PageSelector } from "@/components/PageSelector";
import { InfoIcon } from "@/components/icons/icons";

import { useConnectorCredentialIndexingStatus } from "@/lib/hooks";
import { ConnectorIndexingStatus, DocumentSet } from "@/lib/types";
import { useState } from "react";
import { useDocumentSets } from "./hooks";
import { ConnectorTitle } from "@/components/admin/connectors/ConnectorTitle";
import { deleteDocumentSet } from "./lib";
import { PopupSpec, usePopup } from "@/components/admin/connectors/Popup";
import { AdminPageTitle } from "@/components/admin/Title";
import { DeleteButton } from "@/components/DeleteButton";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

const numToDisplay = 50;

const EditRow = ({ documentSet }: { documentSet: DocumentSet }) => {
  const router = useRouter();

  return (
    <div className="relative flex">
      <CustomTooltip
        trigger={
          <Button
            variant="ghost"
            className={
              documentSet.is_up_to_date ? "cursor-pointer" : " cursor-default"
            }
            onClick={() => {
              if (documentSet.is_up_to_date) {
                router.push(`/admin/documents/sets/${documentSet.id}`);
              }
            }}
          >
            <Pencil size={16} className="my-auto mr-1 " />
            {documentSet.name}
          </Button>
        }
      >
        <div>
          <InfoIcon className="flex flex-shrink-0 mt-1 mr-2" /> Cannot update
          while syncing! Wait for the sync to finish, then try again.
        </div>
      </CustomTooltip>
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
      <h3 className="font-semibold pb-5">Existing Document Sets</h3>
      <Table className="mt-2 overflow-visible">
        <TableHeader>
          <TableRow>
            <TableHead className="pl-8">Name</TableHead>
            <TableHead>Connectors</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Delete</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documentSets
            .slice((page - 1) * numToDisplay, page * numToDisplay)
            .map((documentSet) => {
              return (
                <TableRow key={documentSet.id}>
                  <TableCell className="break-all whitespace-normal">
                    <div className="flex gap-x-1 ">
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
                      <Badge variant="success">
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

      <div className="flex mt-3">
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
    <div>
      {popup}
      <p className="pb-6">
        <b>Document Sets</b> allow you to group logically connected documents
        into a single bundle. These can then be used as filter when performing
        searches in the web UI to limit the amount of information the bot
        searches over when answering in a specific channel or with a certain
        command.
      </p>

      <div className="flex pb-6">
        <Link href="/admin/documents/sets/new">
          <Button className="my-auto">New Document Set</Button>
        </Link>
      </div>

      {documentSets.length > 0 && (
        <>
          <DocumentSetTable
            documentSets={documentSets}
            ccPairs={ccPairs}
            refresh={refreshDocumentSets}
            setPopup={setPopup}
          />
        </>
      )}
    </div>
  );
};

const Page = () => {
  return (
    <div className="container mx-auto">
      <AdminPageTitle icon={<Bookmark size={32} />} title="Document Sets" />

      <Main />
    </div>
  );
};

export default Page;
