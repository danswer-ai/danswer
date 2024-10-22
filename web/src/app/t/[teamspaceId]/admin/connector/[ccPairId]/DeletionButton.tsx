"use client";

import { Button } from "@/components/ui/button";
import { CCPairFullInfo } from "./types";
import { deleteCCPair } from "@/lib/documentDeletion";
import { mutate } from "swr";
import { buildCCPairInfoUrl } from "./lib";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Trash } from "lucide-react";

export function DeletionButton({ ccPair }: { ccPair: CCPairFullInfo }) {
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
    tooltip = "You must pause the connector before deleting it";
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() =>
              deleteCCPair(ccPair.connector.id, ccPair.credential.id, () =>
                mutate(buildCCPairInfoUrl(ccPair.id))
              )
            }
            disabled={!ccPair.connector.disabled || isDeleting}
            variant="destructive"
          >
            <Trash size={16} /> Delete
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
