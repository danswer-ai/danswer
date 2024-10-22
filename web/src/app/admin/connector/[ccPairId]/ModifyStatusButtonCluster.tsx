"use client";

import { CCPairFullInfo, ConnectorCredentialPairStatus } from "./types";
import { usePopup } from "@/components/admin/connectors/Popup";
import { mutate } from "swr";
import { buildCCPairInfoUrl } from "./lib";
import { setCCPairStatus } from "@/lib/ccPair";
import { Button } from "@/components/ui/button";
import { CustomTooltip } from "@/components/CustomTooltip";

export function ModifyStatusButtonCluster({
  ccPair,
}: {
  ccPair: CCPairFullInfo;
}) {
  const { popup, setPopup } = usePopup();
  return (
    <>
      {popup}
      {ccPair.status === ConnectorCredentialPairStatus.PAUSED ? (
        <CustomTooltip
          trigger={
            <Button
              onClick={() =>
                setCCPairStatus(
                  ccPair.id,
                  ConnectorCredentialPairStatus.ACTIVE,
                  setPopup,
                  () => mutate(buildCCPairInfoUrl(ccPair.id))
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
                  setPopup,
                  () => mutate(buildCCPairInfoUrl(ccPair.id))
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
