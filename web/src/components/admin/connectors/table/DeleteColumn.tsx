import { InfoIcon } from "@/components/icons/icons";
import { deleteCCPair } from "@/lib/documentDeletion";
import { ConnectorIndexingStatus } from "@/lib/types";
import { PopupSpec } from "../Popup";
import { useState } from "react";
import { DeleteButton } from "@/components/DeleteButton";
import { CustomTooltip } from "@/components/CustomTooltip";

interface Props<ConnectorConfigType, ConnectorCredentialType> {
  connectorIndexingStatus: ConnectorIndexingStatus<
    ConnectorConfigType,
    ConnectorCredentialType
  >;
  onUpdate: () => void;
}

export function DeleteColumn<ConnectorConfigType, ConnectorCredentialType>({
  connectorIndexingStatus,
  onUpdate,
}: Props<ConnectorConfigType, ConnectorCredentialType>) {
  const [deleteHovered, setDeleteHovered] = useState<boolean>(false);

  const connector = connectorIndexingStatus.connector;
  const credential = connectorIndexingStatus.credential;

  return (
    <>
      {connectorIndexingStatus.is_deletable ? (
        <CustomTooltip
          trigger={
            <DeleteButton
              onClick={() =>
                deleteCCPair(connector.id, credential.id, onUpdate)
              }
            />
          }
        >
          Click to delete this connector
        </CustomTooltip>
      ) : (
        <CustomTooltip trigger={<DeleteButton disabled />}>
          <div className="flex items-center gap-1">
            <InfoIcon /> In order to delete a connector it must be disabled and
            have no ongoing / planned index jobs.
          </div>
        </CustomTooltip>
      )}
    </>
  );
}
