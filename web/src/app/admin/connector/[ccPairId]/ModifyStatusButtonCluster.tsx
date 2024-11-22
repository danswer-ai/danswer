"use client";

import { Button } from "@/components/ui/button";
import { CCPairFullInfo, ConnectorCredentialPairStatus } from "./types";
import { usePopup } from "@/components/admin/connectors/Popup";
import { mutate } from "swr";
import { buildCCPairInfoUrl } from "./lib";
import { setCCPairStatus } from "@/lib/ccPair";
import { useState } from "react";

export function ModifyStatusButtonCluster({
  ccPair,
}: {
  ccPair: CCPairFullInfo;
}) {
  const { popup, setPopup } = usePopup();
  const [isUpdating, setIsUpdating] = useState(false);
  const [buttonText, setButtonText] = useState<string | null>(null);

  const handleStatusChange = async (
    newStatus: ConnectorCredentialPairStatus
  ) => {
    if (isUpdating) return; // Prevent double-clicks or multiple requests
    setIsUpdating(true);

    // Temporarily set the button text to reflect the action
    setButtonText(
      newStatus === ConnectorCredentialPairStatus.ACTIVE
        ? "Resuming..."
        : "Pausing..."
    );

    try {
      // Call the backend to update the status
      await setCCPairStatus(ccPair.id, newStatus, setPopup);

      // Use mutate to revalidate the status on the backend
      await mutate(buildCCPairInfoUrl(ccPair.id));
    } catch (error) {
      console.error("Failed to update status", error);
    } finally {
      // Reset local updating state and button text after mutation
      setIsUpdating(false);
      setButtonText(null);
    }
  };

  // Compute the button text based on current state and backend status
  const computedButtonText = buttonText
    ? buttonText
    : ccPair.status === ConnectorCredentialPairStatus.PAUSED
      ? "Re-Enable"
      : "Pause";

  return (
    <>
      {popup}
      <Button
        variant={
          ccPair.status === ConnectorCredentialPairStatus.PAUSED
            ? "success-reverse"
            : "default"
        }
        disabled={isUpdating}
        onClick={() =>
          handleStatusChange(
            ccPair.status === ConnectorCredentialPairStatus.PAUSED
              ? ConnectorCredentialPairStatus.ACTIVE
              : ConnectorCredentialPairStatus.PAUSED
          )
        }
        tooltip={
          ccPair.status === ConnectorCredentialPairStatus.PAUSED
            ? "Click to start indexing again!"
            : "When paused, the connector's documents will still be visible. However, no new documents will be indexed."
        }
      >
        {computedButtonText}
      </Button>
    </>
  );
}
