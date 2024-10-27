import { ConnectorCredentialPairStatus } from "@/app/admin/connector/[ccPairId]/types";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import { useToast } from "@/hooks/use-toast";

export async function setCCPairStatus(
  ccPairId: number,
  ccPairStatus: ConnectorCredentialPairStatus,
  onUpdate?: () => void
) {

  const { toast } = useToast();

  try {
    const response = await fetch(
      `/api/manage/admin/cc-pair/${ccPairId}/status`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: ccPairStatus }),
      }
    );

    if (!response.ok) {
      const { detail } = await response.json();
      toast({
        title: "Update Failed",
        description: `Failed to update connector status - ${detail}`,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Status Updated",
      description:
        ccPairStatus === ConnectorCredentialPairStatus.ACTIVE
          ? "Enabled connector!"
          : "Paused connector!",
      variant: "success",
    });

    if (onUpdate) onUpdate();
  } catch (error) {
    console.error("Error updating CC pair status:", error);
    toast({
      title: "Error",
      description: "Failed to update connector status",
      variant: "destructive",
    });
  }
}