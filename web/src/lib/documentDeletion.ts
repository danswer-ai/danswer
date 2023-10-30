import { PopupSpec } from "@/components/admin/connectors/Popup";
import { DeletionAttemptSnapshot } from "./types";

export async function scheduleDeletionJobForConnector(
  connectorId: number,
  credentialId: number
) {
  // Will schedule a background job which will:
  // 1. Remove all documents indexed by the connector / credential pair
  // 2. Remove the connector (if this is the only pair using the connector)
  const response = await fetch(`/api/manage/admin/deletion-attempt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      connector_id: connectorId,
      credential_id: credentialId,
    }),
  });
  if (response.ok) {
    return null;
  }
  return (await response.json()).detail;
}

export async function deleteCCPair(
  connectorId: number,
  credentialId: number,
  setPopup: (popupSpec: PopupSpec | null) => void,
  onCompletion: () => void
) {
  const deletionScheduleError = await scheduleDeletionJobForConnector(
    connectorId,
    credentialId
  );
  if (deletionScheduleError) {
    setPopup({
      message:
        "Failed to schedule deletion of connector - " + deletionScheduleError,
      type: "error",
    });
  } else {
    setPopup({
      message: "Scheduled deletion of connector!",
      type: "success",
    });
  }
  onCompletion();
}

export function isCurrentlyDeleting(
  deletionAttempt: DeletionAttemptSnapshot | null
) {
  if (!deletionAttempt) {
    return false;
  }

  return (
    deletionAttempt.status === "PENDING" || deletionAttempt.status === "STARTED"
  );
}
