import { InfoIcon, TrashIcon } from "@/components/icons/icons";
import { scheduleDeletionJobForConnector } from "@/lib/documentDeletion";
import { ConnectorIndexingStatus } from "@/lib/types";
import { PopupSpec } from "../Popup";
import { useState } from "react";

interface Props<ConnectorConfigType, ConnectorCredentialType> {
  connectorIndexingStatus: ConnectorIndexingStatus<
    ConnectorConfigType,
    ConnectorCredentialType
  >;
  setPopup: (popupSpec: PopupSpec | null) => void;
  onUpdate: () => void;
}

export function DeleteColumn<ConnectorConfigType, ConnectorCredentialType>({
  connectorIndexingStatus,
  setPopup,
  onUpdate,
}: Props<ConnectorConfigType, ConnectorCredentialType>) {
  const [deleteHovered, setDeleteHovered] = useState<boolean>(false);

  const connector = connectorIndexingStatus.connector;
  const credential = connectorIndexingStatus.credential;

  return (
    <div
      className="relative"
      onMouseEnter={() => setDeleteHovered(true)}
      onMouseLeave={() => setDeleteHovered(false)}
    >
      {connectorIndexingStatus.is_deletable ? (
        <div
          className="cursor-pointer mx-auto flex"
          onClick={async () => {
            const deletionScheduleError = await scheduleDeletionJobForConnector(
              connector.id,
              credential.id
            );
            if (deletionScheduleError) {
              setPopup({
                message:
                  "Failed to schedule deletion of connector - " +
                  deletionScheduleError,
                type: "error",
              });
            } else {
              setPopup({
                message: "Scheduled deletion of connector!",
                type: "success",
              });
            }
            setTimeout(() => {
              setPopup(null);
            }, 4000);
            onUpdate();
          }}
        >
          <TrashIcon />
        </div>
      ) : (
        <div>
          {deleteHovered && (
            <div className="flex flex-nowrap absolute mt-8 top-0 left-0 bg-gray-700 px-3 py-2 rounded shadow-lg text-xs">
              <InfoIcon className="flex flex-shrink-0 text-blue-300 mr-2" />
              In order to delete a connector it must be disabled and have no
              ongoing / planned index jobs.
            </div>
          )}
          <div className="flex mx-auto text-xs">
            <TrashIcon className="my-auto flex flex-shrink-0 text-gray-600 mr-2" />
          </div>
        </div>
      )}
    </div>
  );
}
