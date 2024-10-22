"use client";

import { PopupSpec, usePopup } from "@/components/admin/connectors/Popup";
import { runConnector } from "@/lib/connector";
import { mutate } from "swr";
import { buildCCPairInfoUrl } from "./lib";
import { useState } from "react";
import { Modal } from "@/components/Modal";
import { useToast } from "@/hooks/use-toast";
import { Divider } from "@/components/Divider";
import { CustomTooltip } from "@/components/CustomTooltip";
import { Button } from "@/components/ui/button";

function ReIndexPopup({
  connectorId,
  credentialId,
  ccPairId,
  hide,
}: {
  connectorId: number;
  credentialId: number;
  ccPairId: number;
  hide: () => void;
}) {
  const { toast } = useToast();
  async function triggerIndexing(fromBeginning: boolean) {
    const errorMsg = await runConnector(
      connectorId,
      [credentialId],
      fromBeginning
    );
    if (errorMsg) {
      toast({
        title: "Connector Run Failed",
        description: `An error occurred while triggering the connector: ${errorMsg}`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Connector Run Successful",
        description: "The connector has been triggered successfully.",
        variant: "success",
      });
    }
    mutate(buildCCPairInfoUrl(ccPairId));
  }

  return (
    <Modal title="Run Indexing" onOutsideClick={hide}>
      <div>
        <Button
          className="ml-auto"
          onClick={() => {
            triggerIndexing(false);
            hide();
          }}
        >
          Run Update
        </Button>

        <p className="mt-2">
          This will pull in and index all documents that have changed and/or
          have been added since the last successful indexing run.
        </p>

        <Divider />

        <Button
          className="ml-auto"
          onClick={() => {
            triggerIndexing(true);
            hide();
          }}
        >
          Run Complete Re-Indexing
        </Button>

        <p className="mt-2">
          This will cause a complete re-indexing of all documents from the
          source.
        </p>

        <p className="mt-2">
          <b>NOTE:</b> depending on the number of documents stored in the
          source, this may take a long time.
        </p>
      </div>
    </Modal>
  );
}

export function ReIndexButton({
  ccPairId,
  connectorId,
  credentialId,
  isDisabled,
  isDeleting,
}: {
  ccPairId: number;
  connectorId: number;
  credentialId: number;
  isDisabled: boolean;
  isDeleting: boolean;
}) {
  const [reIndexPopupVisible, setReIndexPopupVisible] = useState(false);
  const { popup, setPopup } = usePopup();
  return (
    <>
      {reIndexPopupVisible && (
        <ReIndexPopup
          connectorId={connectorId}
          credentialId={credentialId}
          ccPairId={ccPairId}
          hide={() => setReIndexPopupVisible(false)}
        />
      )}
      {popup}
      {isDeleting || isDisabled ? (
        <CustomTooltip
          trigger={
            <Button
              className="ml-auto"
              onClick={() => {
                setReIndexPopupVisible(true);
              }}
              disabled={isDisabled || isDeleting}
            >
              Index
            </Button>
          }
          asChild
        >
          <Button
            className="ml-auto"
            onClick={() => {
              setReIndexPopupVisible(true);
            }}
            disabled={isDisabled || isDeleting}
          >
            {isDeleting
              ? "Cannot index while connector is deleting"
              : isDisabled
                ? "Connector must be re-enabled before indexing"
                : undefined}
          </Button>
        </CustomTooltip>
      ) : (
        <Button
          className="ml-auto"
          onClick={() => {
            setReIndexPopupVisible(true);
          }}
          disabled={isDisabled || isDeleting}
        >
          Index
        </Button>
      )}
    </>
  );
}
