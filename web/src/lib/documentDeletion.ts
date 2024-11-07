import { PopupSpec } from "@/components/admin/connectors/Popup";
import { DeletionAttemptSnapshot } from "./types";
import { toast } from "@/hooks/use-toast";

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
  onCompletion: () => void
) {
  const deletionScheduleError = await scheduleDeletionJobForConnector(
    connectorId,
    credentialId
  );
  if (deletionScheduleError) {
    toast({
      title: "Error",
      description:
        "Failed to schedule deletion of connector - " + deletionScheduleError,
      variant: "destructive",
    });
  } else {
    toast({
      title: "Success",
      description: "Scheduled deletion of connector!",
      variant: "success",
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

export const removeCCPair = async (
  id: number,
  teamspaceId: string | string[]
) => {
  try {
    const response = await fetch(
      `/api/manage/admin/teamspace/connector-remove/${teamspaceId}?cc_pair_id=${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.ok) {
      toast({
        title: "Success",
        description: "Connector removed successfully!",
        variant: "success",
      });
    } else {
      const errorData = await response.json();
      toast({
        title: "Error",
        description: `Failed to remove connector - ${errorData.detail}`,
        variant: "destructive",
      });
    }
  } catch (error) {
    toast({
      title: "Error",
      description: "An error occurred while removing the connector.",
      variant: "destructive",
    });
  }
};
