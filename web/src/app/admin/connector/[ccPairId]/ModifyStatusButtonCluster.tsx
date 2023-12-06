"use client";

import { Button } from "@tremor/react";
import { CCPairFullInfo } from "./types";
import { usePopup } from "@/components/admin/connectors/Popup";
import { disableConnector } from "@/lib/connector";
import { useRouter } from "next/navigation";

export function ModifyStatusButtonCluster({
  ccPair,
}: {
  ccPair: CCPairFullInfo;
}) {
  const router = useRouter();
  const { popup, setPopup } = usePopup();

  return (
    <>
      {popup}
      {ccPair.connector.disabled ? (
        <Button
          color="green"
          size="xs"
          onClick={() =>
            disableConnector(ccPair.connector, setPopup, () => router.refresh())
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
            disableConnector(ccPair.connector, setPopup, () => router.refresh())
          }
          tooltip={
            "When disabled, the connectors documents will still" +
            " be visible. However, no new documents will be indexed."
          }
        >
          Disable
        </Button>
      )}
    </>
  );
}
