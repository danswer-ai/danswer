import { TrashIcon } from "@/components/icons/icons";
import { scheduleDeletionJobForConnector } from "@/lib/documentDeletion";
import { ConnectorIndexingStatus } from "@/lib/types";
import { PopupSpec } from "../Popup";

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
  const connector = connectorIndexingStatus.connector;
  const credential = connectorIndexingStatus.credential;

  return connectorIndexingStatus.is_deletable ? (
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
    <div className="flex mx-auto text-xs">
      <TrashIcon className="my-auto flex flex-shrink-0 text-gray-600 mr-2" />
    </div>
  );
}
