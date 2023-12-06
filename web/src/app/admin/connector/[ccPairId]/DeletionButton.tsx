"use client";

import { Button } from "@tremor/react";
import { CCPairFullInfo } from "./types";
import { usePopup } from "@/components/admin/connectors/Popup";
import { useRouter } from "next/navigation";
import { FiTrash } from "react-icons/fi";
import { deleteCCPair } from "@/lib/documentDeletion";

export function DeletionButton({ ccPair }: { ccPair: CCPairFullInfo }) {
  const router = useRouter();
  const { popup, setPopup } = usePopup();

  const isDeleting =
    ccPair?.latest_deletion_attempt?.status === "PENDING" ||
    ccPair?.latest_deletion_attempt?.status === "STARTED";

  let tooltip: string;
  if (ccPair.connector.disabled) {
    if (isDeleting) {
      tooltip = "This connector is currently being deleted";
    } else {
      tooltip = "Click to delete";
    }
  } else {
    tooltip = "You must disable the connector before deleting it";
  }

  return (
    <div>
      {popup}
      <Button
        size="xs"
        color="red"
        onClick={() =>
          deleteCCPair(
            ccPair.connector.id,
            ccPair.credential.id,
            setPopup,
            () => router.refresh()
          )
        }
        icon={FiTrash}
        disabled={!ccPair.connector.disabled || isDeleting}
        tooltip={tooltip}
      >
        Schedule for Deletion
      </Button>
    </div>
  );
}
