"use client";

import { Button } from "@tremor/react";
import { CCPairFullInfo } from "./types";
import { usePopup } from "@/components/admin/connectors/Popup";
import { disableConnector } from "@/lib/connector";
import { mutate } from "swr";
import { buildCCPairInfoUrl } from "./lib";

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
