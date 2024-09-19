"use client";

import { AdminPageTitle } from "@/components/admin/Title";
import { BookmarkIcon } from "@/components/icons/icons";
import { DocumentSetCreationForm } from "../DocumentSetCreationForm";
import {
  useConnectorCredentialIndexingStatus,
  useTeamspaces,
} from "@/lib/hooks";
import { ThreeDotsLoader } from "@/components/Loading";
import { BackButton } from "@/components/BackButton";
import { ErrorCallout } from "@/components/ErrorCallout";
import { useRouter } from "next/navigation";
import { Teamspace } from "@/lib/types";
import { refreshDocumentSets } from "../hooks";
import { Bookmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

function Main() {
  const router = useRouter();

  const {
    data: ccPairs,
    isLoading: isCCPairsLoading,
    error: ccPairsError,
  } = useConnectorCredentialIndexingStatus();

  // EE only
  const { data: teamspaces, isLoading: teamspacesIsLoading } = useTeamspaces();

  if (isCCPairsLoading || teamspacesIsLoading) {
    return <ThreeDotsLoader />;
  }

  if (ccPairsError || !ccPairs) {
    return (
      <ErrorCallout
        errorTitle="Failed to fetch Connectors"
        errorMsg={ccPairsError}
      />
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          <DocumentSetCreationForm
            ccPairs={ccPairs}
            teamspaces={teamspaces}
            onClose={() => {
              refreshDocumentSets();
              router.push("/admin/documents/sets");
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}

const Page = () => {
  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="container">
        <BackButton />

        <AdminPageTitle
          icon={<Bookmark size={32} />}
          title="New Document Set"
        />

        <Main />
      </div>
    </div>
  );
};

export default Page;
