"use client";

import { usePopup } from "@/components/admin/connectors/Popup";
import { runConnector } from "@/lib/connector";
import { Button } from "@tremor/react";
import { useRouter } from "next/navigation";

export function ReIndexButton({
  connectorId,
  credentialId,
  isDisabled,
}: {
  connectorId: number;
  credentialId: number;
  isDisabled: boolean;
}) {
  const router = useRouter();
  const { popup, setPopup } = usePopup();

  return (
    <>
      {popup}
      <Button
        className="ml-auto"
        variant="secondary"
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
          router.refresh();
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
