"use client";

import { ErrorCallout } from "@/components/ErrorCallout";
import { refreshDocumentSets, useDocumentSets } from "../hooks";
import {
  useConnectorCredentialIndexingStatus,
  useTeamspaces,
} from "@/lib/hooks";
import { ThreeDotsLoader } from "@/components/Loading";
import { AdminPageTitle } from "@/components/admin/Title";
import { BookmarkIcon } from "@/components/icons/icons";
import { BackButton } from "@/components/BackButton";
import { DocumentSetCreationForm } from "../DocumentSetCreationForm";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

function Main({ documentSetId }: { documentSetId: number }) {
  const router = useRouter();

  const {
    data: documentSets,
    isLoading: isDocumentSetsLoading,
    error: documentSetsError,
  } = useDocumentSets();

  const {
    data: ccPairs,
    isLoading: isCCPairsLoading,
    error: ccPairsError,
  } = useConnectorCredentialIndexingStatus();

  // EE only
  const { data: teamspaces, isLoading: teamspacesIsLoading } = useTeamspaces();

  if (isDocumentSetsLoading || isCCPairsLoading || teamspacesIsLoading) {
    return <ThreeDotsLoader />;
  }

  if (documentSetsError || !documentSets) {
    return (
      <ErrorCallout
        errorTitle="Failed to fetch document sets"
        errorMsg={documentSetsError}
      />
    );
  }

  if (ccPairsError || !ccPairs) {
    return (
      <ErrorCallout
        errorTitle="Failed to fetch Connectors"
        errorMsg={ccPairsError}
      />
    );
  }

  const documentSet = documentSets.find(
    (documentSet) => documentSet.id === documentSetId
  );
  if (!documentSet) {
    return (
      <ErrorCallout
        errorTitle="Document set not found"
        errorMsg={`Document set with id ${documentSetId} not found`}
      />
    );
  }

  return (
    <div>
      <BackButton />

      <AdminPageTitle icon={<Bookmark size={32} />} title={documentSet.name} />

      <Card>
        <CardContent>
          <DocumentSetCreationForm
            ccPairs={ccPairs}
            teamspaces={teamspaces}
            onClose={() => {
              refreshDocumentSets();
              router.push("/admin/documents/sets");
            }}
            existingDocumentSet={documentSet}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page({
  params,
}: {
  params: { documentSetId: string };
}) {
  const documentSetId = parseInt(params.documentSetId);

  return (
    <div>
      <BackButton />

      <Main documentSetId={documentSetId} />
    </div>
  );
}
