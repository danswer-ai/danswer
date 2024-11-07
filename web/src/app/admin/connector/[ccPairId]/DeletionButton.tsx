"use client";

import { Button } from "@/components/ui/button";
import { CCPairFullInfo, ConnectorCredentialPairStatus } from "./types";
import { deleteCCPair, removeCCPair } from "@/lib/documentDeletion";
import { mutate } from "swr";
import { buildCCPairInfoUrl } from "./lib";
import { Trash } from "lucide-react";
import { CustomTooltip } from "@/components/CustomTooltip";
import { useState } from "react";
import { DeleteModal } from "@/components/DeleteModal";
import { useRouter } from "next/navigation";

export function DeletionButton({
  ccPair,
  teamspaceId,
}: {
  ccPair: CCPairFullInfo;
  teamspaceId?: string | string[];
}) {
  const router = useRouter();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const isDeleting =
    ccPair?.latest_deletion_attempt?.status === "PENDING" ||
    ccPair?.latest_deletion_attempt?.status === "STARTED";

  let tooltip: string;
  if (ccPair.status !== ConnectorCredentialPairStatus.ACTIVE) {
    if (isDeleting) {
      tooltip = `This connector is currently being ${teamspaceId ? "removed" : "deleted"}`;
    } else {
      tooltip = `Click to ${teamspaceId ? "remove" : "delete"}`;
    }
  } else {
    tooltip = `You must pause the connector before ${teamspaceId ? "removing" : "deleting"} it`;
  }

  console.log(ccPair);

  return (
    <>
      {isDeleteModalOpen && (
        <DeleteModal
          title="Are you sure you want to remove this data source?"
          onClose={() => setIsDeleteModalOpen(false)}
          open={isDeleteModalOpen}
          description="You are about to remove this data source."
          onSuccess={() => {
            if (teamspaceId) {
              removeCCPair(ccPair.id, teamspaceId);
            } else {
              deleteCCPair(ccPair.connector.id, ccPair.credential.id, () =>
                mutate(buildCCPairInfoUrl(ccPair.id))
              );
            }
            setIsDeleteModalOpen(false);
            router.push(
              teamspaceId
                ? `/t/${teamspaceId}/admin/indexing/status`
                : "/admin/indexing/status"
            );
          }}
        />
      )}
      <CustomTooltip
        trigger={
          <Button
            onClick={() => {
              setIsDeleteModalOpen(true);
            }}
            disabled={
              ccPair.status === ConnectorCredentialPairStatus.ACTIVE ||
              isDeleting
            }
            variant="destructive"
          >
            <Trash size={16} /> {teamspaceId ? "Remove" : "Delete"}
          </Button>
        }
        variant="destructive"
      >
        <p>{tooltip}</p>
      </CustomTooltip>
    </>
  );
}
