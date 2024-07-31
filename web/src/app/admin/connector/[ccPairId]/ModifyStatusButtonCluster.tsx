"use client";

import { CCPairFullInfo } from "./types";
import { usePopup } from "@/components/admin/connectors/Popup";
import { disableConnector } from "@/lib/connector";
import { mutate } from "swr";
import { buildCCPairInfoUrl } from "./lib";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

export function ModifyStatusButtonCluster({
  ccPair,
}: {
  ccPair: CCPairFullInfo;
}) {
  const { popup, setPopup } = usePopup();

  return (
    <>
      {popup}
      {ccPair.connector.disabled ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() =>
                  disableConnector(ccPair.connector, setPopup, () =>
                    mutate(buildCCPairInfoUrl(ccPair.id))
                  )
                }
              >
                Re-Enable
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Click to start indexing again!</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() =>
                  disableConnector(ccPair.connector, setPopup, () =>
                    mutate(buildCCPairInfoUrl(ccPair.id))
                  )
                }
              >
                Pause
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-[200px]">
                When paused, the connectors documents will still be visible.
                However, no new documents will be indexed.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </>
  );
}
