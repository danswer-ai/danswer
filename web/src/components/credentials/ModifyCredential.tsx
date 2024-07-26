import React, { useState } from "react";
import { Modal } from "@/components/Modal";
import { Button, Text, Badge } from "@tremor/react";
import { ValidSources } from "@/lib/types";
import { FaCreativeCommons } from "react-icons/fa";
import { EditIcon, SwapIcon, TrashIcon } from "@/components/icons/icons";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import { getSourceDisplayName } from "@/lib/sources";
import { ConfluenceCredentialJson, Credential } from "@/lib/ccs/credentials";
import { Connector } from "@/lib/ccs/connectors";

interface CredentialSelectionTableProps {
  credentials: Credential<any>[];
  onSelectCredential: (credential: Credential<any> | null) => void;
  currentCredentialId?: number;
  onDeleteCredential: (credential: Credential<any>) => void;
  onEditCredential?: (credential: Credential<any>) => void;
}

const CredentialSelectionTable: React.FC<CredentialSelectionTableProps> = ({
  credentials,
  onEditCredential,
  onSelectCredential,
  currentCredentialId,
  onDeleteCredential,
}) => {
  const [selectedCredentialId, setSelectedCredentialId] = useState<
    number | null
  >(null);

  const handleSelectCredential = (credentialId: number) => {
    const newSelectedId =
      selectedCredentialId === credentialId ? null : credentialId;
    setSelectedCredentialId(newSelectedId);

    const selectedCredential =
      credentials.find((cred) => cred.id === newSelectedId) || null;
    onSelectCredential(selectedCredential);
  };

  return (
    <div className="w-full overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left font-medium text-gray-600"></th>
            <th className="p-2 text-left font-medium text-gray-600">ID</th>
            <th className="p-2 text-left font-medium text-gray-600">Name</th>
            <th className="p-2 text-left font-medium text-gray-600">Created</th>
            <th className="p-2 text-left font-medium text-gray-600">
              Last Updated
            </th>
            <th />
          </tr>
        </thead>

        {credentials.length > 0 && (
          <tbody>
            {credentials.map((credential, ind) => {
              const selected = currentCredentialId
                ? credential.id == currentCredentialId
                : false;
              return (
                <tr key={credential.id} className="border-b hover:bg-gray-50">
                  <td className="min-w-[60px] p-2">
                    {!selected ? (
                      <input
                        type="radio"
                        name="credentialSelection"
                        onChange={() => handleSelectCredential(credential.id)}
                        className="form-radio ml-4 h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
                      />
                    ) : (
                      <Badge>current</Badge>
                    )}
                  </td>
                  <td className="p-2">{credential.id}</td>
                  <td className="p-2">
                    <p>{credential.name ?? "Untitled"}</p>
                  </td>
                  <td className="p-2">
                    {new Date(credential.time_created).toLocaleString()}
                  </td>
                  <td className="p-2">
                    {new Date(credential.time_updated).toLocaleString()}
                  </td>
                  <td className="pt-3 flex gap-x-2 content-center mt-auto">
                    <button
                      disabled={selected}
                      onClick={async () => {
                        onDeleteCredential(credential);
                      }}
                      className="disabled:opacity-20 enabled:cursor-pointer my-auto"
                    >
                      <TrashIcon />
                    </button>
                    {onEditCredential && (
                      <button
                        onClick={() => onEditCredential(credential)}
                        className="cursor-pointer my-auto"
                      >
                        <EditIcon />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        )}
      </table>

      {credentials.length == 0 && (
        <p className="mt-4"> No credentials exist for this connector!</p>
      )}
    </div>
  );
};

export default function ModifyCredential({
  onClose = () => null,
  showIfEmpty,
  attachedConnector,
  onSwap,
  onCreateNew = () => null,
  display,
  onEditCredential,
  onDeleteCredential,
  setPopup,
  credentials,
  source,
  defaultedCredential,
  onSwitch,
}: {
  showIfEmpty?: boolean;
  attachedConnector?: Connector<any>;
  defaultedCredential?: Credential<any>;
  display?: boolean;
  credentials: Credential<any>[];
  source: ValidSources;
  setPopup: (popupSpec: PopupSpec | null) => void;
  onDeleteCredential: (credential: Credential<any | null>) => void;
  onEditCredential?: (credential: Credential<ConfluenceCredentialJson>) => void;
  onClose?: () => void;
  onSwitch?: (newCredential: Credential<any>) => void;
  onSwap?: (newCredential: Credential<any>, connectorId: number) => void;
  onCreateNew?: () => void;
}) {
  const [selectedCredential, setSelectedCredential] =
    React.useState<Credential<any> | null>(null);
  const [confirmDeletionCredential, setConfirmDeletionCredential] =
    useState<null | Credential<any>>(null);

  if (!credentials) {
    return <></>;
  }

  const sourceName = getSourceDisplayName(source);

  return (
    <>
      {confirmDeletionCredential != null && (
        <Modal
          onOutsideClick={() => setConfirmDeletionCredential(null)}
          className="max-w-sm"
        >
          <>
            <p className="text-lg mb-2">
              Are you sure you want to delete this? All historical data will be
              deleted as well.
            </p>
            <div className="mt-6 flex justify-between">
              <button
                className="rounded py-1.5 px-2 bg-neutral-800 text-neutral-200"
                onClick={async () => {
                  await onDeleteCredential(confirmDeletionCredential);
                }}
              >
                Yes
              </button>
              <button className="rounded py-1.5 px-2 bg-background-150 text-neutral-800">
                {" "}
                No
              </button>
            </div>
          </>
        </Modal>
      )}

      <div className="mb-0">
        <Text className="mb-4 ">
          {showIfEmpty ? "Select" : "Swap"} credentials as needed! Ensure that
          you have selected a credential with the proper permissions for this
          connector!
        </Text>

        {showIfEmpty ||
        credentials.length > 1 ||
        (display && credentials.length == 1) ? (
          <CredentialSelectionTable
            onDeleteCredential={async (credential: Credential<any | null>) => {
              setConfirmDeletionCredential(credential);
            }}
            onEditCredential={
              onEditCredential
                ? (credential: Credential<ConfluenceCredentialJson>) =>
                    onEditCredential(credential)
                : undefined
            }
            currentCredentialId={
              defaultedCredential ? defaultedCredential.id : undefined
            }
            credentials={credentials}
            onSelectCredential={(credential: Credential<any> | null) => {
              if (credential && onSwitch) {
                onSwitch(credential);
              } else {
                setSelectedCredential(credential);
              }
            }}
          />
        ) : (
          <p className="text-lg">
            You have no additional {sourceName} credentials. Create a new one?
          </p>
        )}

        {!showIfEmpty && (
          <div className="flex mt-8 justify-end">
            {credentials.length > 1 || (display && credentials.length == 1) ? (
              <Button
                disabled={selectedCredential == null}
                onClick={() => {
                  if (onSwap && attachedConnector) {
                    onSwap(selectedCredential!, attachedConnector.id);
                  }
                  if (onSwitch) {
                    onSwitch(selectedCredential!);
                  }
                }}
                className="bg-indigo-500 disabled:border-transparent 
              transition-colors duration-150 ease-in disabled:bg-indigo-300 
              disabled:hover:bg-indigo-300 hover:bg-indigo-600 cursor-pointer"
              >
                <div className="flex gap-x-2 items-center w-full border-none">
                  <SwapIcon className="text-white" />
                  <p>Swap</p>
                </div>
              </Button>
            ) : (
              <Button
                onClick={onCreateNew}
                className="bg-indigo-500 disabled:bg-indigo-300 hover:bg-indigo-400"
              >
                <div className="flex gap-x-2 items-center w-full border-none">
                  <FaCreativeCommons />
                  <p>Create New</p>
                </div>
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
