"use client";

import { CCPairFullInfo, ConnectorCredentialPairStatus } from "./types";
import { setCCPairStatus } from "@/lib/ccPair";
import { Button } from "@/components/ui/button";
import { CustomTooltip } from "@/components/CustomTooltip";

export function ModifyStatusButtonCluster({
  ccPair,
}: {
  ccPair: CCPairFullInfo;
}) {
  return (
    <>
      {ccPair.status === ConnectorCredentialPairStatus.PAUSED ? (
        <CustomTooltip
          trigger={
            <Button
              onClick={() =>
                setCCPairStatus(
                  ccPair.id,
                  ConnectorCredentialPairStatus.ACTIVE,
                )
              }
            >
              Re-Enable
            </Button>
          }
          asChild
        >
          Click to start indexing again!
        </CustomTooltip>
      ) : (
        <CustomTooltip
          trigger={
            <Button
              variant="destructive"
              onClick={() =>
                setCCPairStatus(
                  ccPair.id,
                  ConnectorCredentialPairStatus.PAUSED,
                )
              }
            >
              Pause
            </Button>
          }
          asChild
        >
          When paused, the connectors documents will still be visible. However,
          no new documents will be indexed.
        </CustomTooltip>
      )}
    </>
  );
}
