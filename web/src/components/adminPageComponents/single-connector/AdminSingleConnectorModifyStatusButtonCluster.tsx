"use client";

import { Button } from "@tremor/react";
import { CCPairFullInfo } from "@/app/admin/connector/[ccPairId]/types";
import { usePopup } from "@/hooks/common/usePopup";
import { disableConnector } from "@/lib/connector";
import { mutate } from "swr";
import { buildCCPairInfoUrl } from "@/lib/connector/helpers";

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
        <Button
          color="green"
          size="xs"
          onClick={() =>
            disableConnector(ccPair.connector, setPopup, () =>
              mutate(buildCCPairInfoUrl(ccPair.id))
            )
          }
          tooltip="Click to start indexing again!"
        >
          Re-Enable
        </Button>
      ) : (
        <Button
          color="red"
          size="xs"
          onClick={() =>
            disableConnector(ccPair.connector, setPopup, () =>
              mutate(buildCCPairInfoUrl(ccPair.id))
            )
          }
          tooltip={
            "When paused, the connectors documents will still" +
            " be visible. However, no new documents will be indexed."
          }
        >
          Pause
        </Button>
      )}
    </>
  );
}
