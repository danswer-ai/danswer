"use client";

import { PopupSpec } from "@/components/admin/connectors/Popup";
import { runConnector } from "@/lib/connector";
import { mutate } from "swr";
import { buildCCPairInfoUrl } from "./lib";
import { useState } from "react";
import { Modal } from "@/components/Modal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Divider } from "@/components/Divider";

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
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Triggered connector run",
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
}: {
  ccPairId: number;
  connectorId: number;
  credentialId: number;
  isDisabled: boolean;
}) {
  const [reIndexPopupVisible, setReIndexPopupVisible] = useState(false);

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
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => {
                setReIndexPopupVisible(true);
              }}
              disabled={isDisabled}
            >
              Run Indexing
            </Button>
          </TooltipTrigger>
          {isDisabled ? (
            <TooltipContent>
              Connector must be active in order to run indexing
            </TooltipContent>
          ) : undefined}
        </Tooltip>
      </TooltipProvider>
    </>
  );
}
