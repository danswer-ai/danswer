"use client";

import { DocumentSetCreationForm } from "@/components/adminPageComponents/documents/AdminDocumentsSetsCreationForm";
import {
  useConnectorCredentialIndexingStatus,
  useUserGroups,
} from "@/lib/hooks";
import { ThreeDotsLoader } from "@/components/Loading";
import { usePopup } from "@/hooks/common/usePopup";
import { Card } from "@tremor/react";
import { ErrorCallout } from "@/components/ErrorCallout";
import { useRouter } from "next/navigation";
import { refreshDocumentSets } from "@/hooks/admin/documents/useDocumentsSets";

//todo: it is same as src/components/adminPageComponents/documents/AdminDocumentSetsCreationFormHOC.tsx

export default function DocumentsNewSetCreationFormHOC() {
    const { popup, setPopup } = usePopup();
    const router = useRouter();
  
    const {
      data: ccPairs,
      isLoading: isCCPairsLoading,
      error: ccPairsError,
    } = useConnectorCredentialIndexingStatus();
  
    // EE only
    const { data: userGroups, isLoading: userGroupsIsLoading } = useUserGroups();
  
    if (isCCPairsLoading || userGroupsIsLoading) {
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
          <DocumentSetCreationForm
            ccPairs={ccPairs}
            userGroups={userGroups}
            onClose={() => {
              refreshDocumentSets();
              router.push("/admin/documents/sets");
            }}
            setPopup={setPopup}
          />
        </Card>
      </>
    );
  }