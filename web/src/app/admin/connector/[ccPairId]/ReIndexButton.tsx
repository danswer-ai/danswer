"use client";

import { usePopup } from "@/components/admin/connectors/Popup";
import { runConnector } from "@/lib/connector";
import { Button } from "@tremor/react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import { buildCCPairInfoUrl } from "./lib";

export function ReIndexButton({
  ccPairId,
  connectorId,
  credentialId,
  isDisabled,
}: {
  ccPairId: number;
  connectorId: number;
  credentialId: number;
  isDisabled: boolean;
}) {
  const { popup, setPopup } = usePopup();

  return (
    <>
      {popup}
      <Button
        className="ml-auto"
        color="green"
        size="xs"
        onClick={async () => {
          const errorMsg = await runConnector(connectorId, [credentialId]);
          if (errorMsg) {
            setPopup({
              message: errorMsg,
              type: "error",
            });
          } else {
            setPopup({
              message: "Triggered connector run",
              type: "success",
            });
          }
          mutate(buildCCPairInfoUrl(ccPairId));
        }}
        disabled={isDisabled}
        tooltip={
          isDisabled
            ? "Connector must be active in order to run indexing"
            : undefined
        }
      >
        Run Indexing
      </Button>
    </>
  );
}
