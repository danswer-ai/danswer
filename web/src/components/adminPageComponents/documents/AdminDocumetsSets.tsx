"use client";

import { ThreeDotsLoader } from "@/components/Loading";
import {
  Divider,
} from "@tremor/react";
import { useConnectorCredentialIndexingStatus } from "@/lib/hooks";
import { useDocumentSets } from "@/hooks/admin/documents/useDocumentsSets";
import { usePopup } from "@/hooks/common/usePopup";
import DocumentSetTable from "@/components/adminPageComponents/documents/AdminDocumentsSetsTable";

export default function DocumentsSets (){
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
      </div>
    );
  };