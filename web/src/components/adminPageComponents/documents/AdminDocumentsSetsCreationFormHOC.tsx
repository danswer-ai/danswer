"use client";

import { ErrorCallout } from "@/components/ErrorCallout";
import { refreshDocumentSets, useDocumentSets } from "@/hooks/admin/documents/useDocumentsSets";
import {
  useConnectorCredentialIndexingStatus,
  useUserGroups,
} from "@/lib/hooks";
import { ThreeDotsLoader } from "@/components/Loading";
import { AdminPageTitle } from "@/components/adminPageComponents/Title";
import { BookmarkIcon } from "@/components/icons/icons";
import { Card } from "@tremor/react";
import { DocumentSetCreationForm } from "@/components/adminPageComponents/documents/AdminDocumentsSetsCreationForm";
import { useRouter } from "next/navigation";
import { usePopup } from "@/hooks/common/usePopup";

export default function DocumentSetsCreationFormHOC({ documentSetId }: { documentSetId: number }) {
    const router = useRouter();
    const { popup, setPopup } = usePopup();
  
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
  
    const { data: userGroups, isLoading: userGroupsIsLoading } = useUserGroups();
  
    if (isDocumentSetsLoading || isCCPairsLoading || userGroupsIsLoading) {
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
      (item) => item.id === documentSetId
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
        {popup}
  
        <AdminPageTitle
          icon={<BookmarkIcon size={32} />}
          title={documentSet.name}
        />
  
        <Card>
          <DocumentSetCreationForm
            ccPairs={ccPairs}
            userGroups={userGroups}
            onClose={() => {
              refreshDocumentSets();
              router.push("/admin/documents/sets");
            }}
            setPopup={setPopup}
            existingDocumentSet={documentSet}
          />
        </Card>
      </div>
    );
  }