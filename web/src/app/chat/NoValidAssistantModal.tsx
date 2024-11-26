"use client";

import { useState } from "react";
import { CustomModal } from "@/components/CustomModal";
import { Assistant } from "../admin/assistants/interfaces";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { User } from "@/lib/types";
import { useTeamspaces, useTeamspaceUsers } from "@/lib/hooks";

export function NoValidAssistantModal({
  assistants,
  teamspaceId,
  isTeamspaceAdmin = false,
}: {
  assistants: Assistant[];
  teamspaceId: string | undefined;
  isTeamspaceAdmin: boolean;
}) {
  const { data } = useTeamspaces();
  return (
    <CustomModal
      trigger={null}
      title="No valid assistant for this teamspace"
      open={!assistants || assistants.length === 0}
      description="There is currently no valid assistant assigned to this teamspace, so
          the chat page cannot be used. This may be because the teamspace is
          still syncing, or an assistant has not been assigned yet."
    >
      <div className="flex gap-2 justify-end">
        <Link href="/chat" passHref>
          <Button>Go back to Workspace</Button>
        </Link>

        <Link href={`/t/${teamspaceId}/search`} passHref>
          <Button>Go to Search</Button>
        </Link>

        {isTeamspaceAdmin && (
          <Link
            href={
              teamspaceId
                ? `/t/${teamspaceId}/admin/indexing/status`
                : `/admin/indexing/status`
            }
            passHref
          >
            <Button>Go to Teamspace Admin Panel</Button>
          </Link>
        )}
      </div>
    </CustomModal>
  );
}
