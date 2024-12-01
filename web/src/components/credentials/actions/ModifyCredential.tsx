import React, { useState } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/button";
import Text from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { ConfigurableSources, ValidSources } from "@/lib/types";
import {
  EditIcon,
  NewChatIcon,
  SwapIcon,
  TrashIcon,
} from "@/components/icons/icons";
import {
  ConfluenceCredentialJson,
  Credential,
} from "@/lib/connectors/credentials";
import { Connector } from "@/lib/connectors/connectors";

const CredentialSelectionTable = ({
  credentials,
  editableCredentials,
  onEditCredential,
  onSelectCredential,
  currentCredentialId,
  onDeleteCredential,
}: {
  credentials: Credential<any>[];
  editableCredentials: Credential<any>[];
  onSelectCredential: (credential: Credential<any> | null) => void;
  currentCredentialId?: number;
  onDeleteCredential: (credential: Credential<any>) => void;
  onEditCredential?: (credential: Credential<any>) => void;
}) => {
  const [selectedCredentialId, setSelectedCredentialId] = useState<
    number | null
  >(null);

  const allCredentials = React.useMemo(() => {
    const credMap = new Map(editableCredentials.map((cred) => [cred.id, cred]));
    credentials.forEach((cred) => {
      if (!credMap.has(cred.id)) {
        credMap.set(cred.id, cred);
      }
    });
    return Array.from(credMap.values());
  }, [credentials, editableCredentials]);

  const handleSelectCredential = (credentialId: number) => {
    const newSelectedId =
      selectedCredentialId === credentialId ? null : credentialId;
    setSelectedCredentialId(newSelectedId);

    const selectedCredential =
      allCredentials.find((cred) => cred.id === newSelectedId) || null;
    onSelectCredential(selectedCredential);
  };

  return (
    <div className="w-full max-h-[50vh] overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 w-full">
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

        {allCredentials.length > 0 && (
          <tbody className="w-full">
            {allCredentials.map((credential, ind) => {
              const selected = currentCredentialId
                ? credential.id == (selectedCredentialId || currentCredentialId)
                : false;
              const editable = editableCredentials.some(
                (editableCredential) => editableCredential.id === credential.id
              );
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
                      <Badge>selected</Badge>
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
                      disabled={selected || !editable}
                      onClick={async () => {
                        onDeleteCredential(credential);
                      }}
                      className="disabled:opacity-20 enabled:cursor-pointer my-auto"
                    >
                      <TrashIcon />
                    </button>
                    {onEditCredential && (
                      <button
                        disabled={!editable}
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

      {allCredentials.length == 0 && (
        <p className="mt-4"> No credentials exist for this connector!</p>
      )}
    </div>
  );
};

export default function ModifyCredential({
  close,
  showIfEmpty,
  attachedConnector,
  credentials,
  editableCredentials,
  source,
  defaultedCredential,

  onSwap,
  onSwitch,
  onCreateNew = () => null,
  onEditCredential,
  onDeleteCredential,
  showCreate,
}: {
  close?: () => void;
  showIfEmpty?: boolean;
  attachedConnector?: Connector<any>;
  defaultedCredential?: Credential<any>;
  credentials: Credential<any>[];
  editableCredentials: Credential<any>[];
  source: ConfigurableSources;

  onSwitch?: (newCredential: Credential<any>) => void;
  onSwap?: (newCredential: Credential<any>, connectorId: number) => void;
  onCreateNew?: () => void;
  onDeleteCredential: (credential: Credential<any | null>) => void;
  onEditCredential?: (credential: Credential<ConfluenceCredentialJson>) => void;
  showCreate?: () => void;
}) {
  const [selectedCredential, setSelectedCredential] =
    useState<Credential<any> | null>(null);
  const [confirmDeletionCredential, setConfirmDeletionCredential] =
    useState<null | Credential<any>>(null);

  if (!credentials || !editableCredentials) {
    return <></>;
  }

  return (
    <>
      {confirmDeletionCredential != null && (
        <Modal
          onOutsideClick={() => setConfirmDeletionCredential(null)}
          className="max-w-sm"
        >
          <>
            <p className="text-lg mb-2">
              Are you sure you want to delete this credential? You cannot delete
              credentials that are linked to live connectors.
            </p>
            <div className="mt-6 flex justify-between">
              <button
                className="rounded py-1.5 px-2 bg-background-800 text-text-200"
                onClick={async () => {
                  await onDeleteCredential(confirmDeletionCredential);
                  setConfirmDeletionCredential(null);
                }}
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmDeletionCredential(null)}
                className="rounded py-1.5 px-2 bg-background-150 text-text-800"
              >
                {" "}
                No
              </button>
            </div>
          </>
        </Modal>
      )}

      <div className="mb-0">
        <Text className="mb-4">
          Select a credential as needed! Ensure that you have selected a
          credential with the proper permissions for this connector!
        </Text>

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
          editableCredentials={editableCredentials}
          onSelectCredential={(credential: Credential<any> | null) => {
            if (credential && onSwitch) {
              onSwitch(credential);
            } else {
              setSelectedCredential(credential);
            }
          }}
        />

        {!showIfEmpty && (
          <div className="flex mt-8 justify-between">
            {showCreate ? (
              <Button
                onClick={() => {
                  showCreate();
                }}
                className="bg-neutral-500 disabled:border-transparent 
              transition-colors duration-150 ease-in disabled:bg-neutral-300 
              disabled:hover:bg-neutral-300 hover:bg-neutral-600 cursor-pointer"
              >
                <div className="flex gap-x-2 items-center w-full border-none">
                  <NewChatIcon className="text-white" />
                  <p>Create</p>
                </div>
              </Button>
            ) : (
              <div />
            )}

            <Button
              disabled={selectedCredential == null}
              onClick={() => {
                if (onSwap && attachedConnector) {
                  onSwap(selectedCredential!, attachedConnector.id);
                  if (close) {
                    close();
                  }
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
                <p>Select</p>
              </div>
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
