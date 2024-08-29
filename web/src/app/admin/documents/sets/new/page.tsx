"use client";

import { AdminPageTitle } from "@/components/admin/Title";
import { BookmarkIcon } from "@/components/icons/icons";
import { DocumentSetCreationForm } from "../DocumentSetCreationForm";
import {
  useConnectorCredentialIndexingStatus,
  useTeamspaces,
} from "@/lib/hooks";
import { ThreeDotsLoader } from "@/components/Loading";
import { usePopup } from "@/components/admin/connectors/Popup";
import { BackButton } from "@/components/BackButton";
import { ErrorCallout } from "@/components/ErrorCallout";
import { useRouter } from "next/navigation";
import { Teamspace } from "@/lib/types";
import { refreshDocumentSets } from "../hooks";
import { Bookmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

function Main() {
  const { popup, setPopup } = usePopup();
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
      {popup}

      <Card>
        <CardContent>
          <DocumentSetCreationForm
            ccPairs={ccPairs}
            teamspaces={teamspaces}
            onClose={() => {
              refreshDocumentSets();
              router.push("/admin/documents/sets");
            }}
            setPopup={setPopup}
          />
        </CardContent>
      </Card>
    </>
  );
}

const Page = () => {
  return (
    <div className="container mx-auto">
      <BackButton />

      <AdminPageTitle icon={<Bookmark size={32} />} title="New Document Set" />

      <Main />
    </div>
  );
};

export default Page;
