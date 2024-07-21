import { errorHandlingFetcher } from "@/lib/fetcher";

import React, { useState } from "react";
import { Modal } from "@/components/Modal";
import { Button, Text, Callout, Badge } from "@tremor/react";

import { buildSimilarCredentialInfoURL } from "../../app/admin/connector/[ccPairId]/lib";
import useSWR, { mutate } from "swr";
import { ConfluenceCredentialJson, Credential } from "@/lib/types";
import { FaCreativeCommons, FaSwatchbook } from "react-icons/fa";
import { swapCredential } from "@/lib/credential";
import { EditIcon, SwapIcon, TrashIcon } from "@/components/icons/icons";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import { CCPairFullInfo } from "../../app/admin/connector/[ccPairId]/types";
import { getSourceDisplayName } from "@/lib/sources";
import { setDefaultResultOrder } from "dns";

interface CredentialSelectionTableProps {
  credentials: Credential<any>[];
  onSelectCredential: (credential: Credential<any> | null) => void;
  currentCredentialId: number;
  onDeleteCredential: (credential: Credential<any>) => void;
  onEditCredential: (credential: Credential<any>) => void;
  setPopup: (popupSpec: PopupSpec | null) => void;
}

const CredentialSelectionTable: React.FC<CredentialSelectionTableProps> = ({
  credentials,
  onEditCredential,
  onSelectCredential,
  currentCredentialId,
  onDeleteCredential,
  setPopup,
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
            <th></th>
          </tr>
        </thead>
        <tbody>
          {credentials.map((credential, ind) => {
            const selected = credential.id == currentCredentialId;
            return (
              <tr key={credential.id} className="border-b hover:bg-gray-50">
                <td className="p-2">
                  {!selected ? (
                    <input
                      type="radio"
                      name="credentialSelection"
                      checked={selectedCredentialId === credential.id}
                      onChange={() => handleSelectCredential(credential.id)}
                      className="form-radio h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
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
                <td className="pt-3 flex gap-x-2  content-center mt-auto">
                  <button
                    disabled={selected}
                    onClick={async () => {
                      onDeleteCredential(credential);
                    }}
                    className="disabled:opacity-20 enabled:cursor-pointer my-auto"
                  >
                    <TrashIcon />
                  </button>
                  <button
                    onClick={() => onEditCredential(credential)}
                    className="cursor-pointer my-auto"
                  >
                    <EditIcon />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default function ModifyCredential({
  onClose,
  onSwap,
  onCreateNew,
  onEditCredential,
  onDeleteCredential,
  setPopup,
  ccPair,
}: {
  setPopup: (popupSpec: PopupSpec | null) => void;
  onDeleteCredential: (credential: Credential<any | null>) => void;
  onEditCredential: (credential: Credential<ConfluenceCredentialJson>) => void;
  ccPair: CCPairFullInfo;
  onClose: () => void;
  onSwap: (newCredentialId: number, connectorId: number) => void;
  onCreateNew: () => void;
}) {
  const [selectedCredential, setSelectedCredential] =
    React.useState<Credential<any> | null>(null);
  const [confirmDeletionCredential, setConfirmDeletionCredential] =
    useState<null | Credential<any>>(null);

  const handleSelectCredential = (credential: Credential<any> | null) => {
    setSelectedCredential(credential);
  };

  const {
    data: credentials,
    isLoading,
    error,
  } = useSWR<Credential<ConfluenceCredentialJson>[]>(
    buildSimilarCredentialInfoURL(ccPair.id),
    errorHandlingFetcher,
    { refreshInterval: 5000 } // 5 seconds
  );
  if (!credentials) {
    return <></>;
  }

  const sourceName = getSourceDisplayName(ccPair.connector.source);

  return (
    <Modal
      onOutsideClick={onClose}
      className="max-w-3xl rounded-lg"
      title={`Swap ${sourceName} Credential`}
    >
      <>
        {confirmDeletionCredential != null && (
          <Modal
            onOutsideClick={() => setConfirmDeletionCredential(null)}
            className="max-w-sm"
          >
            <>
              <p className="text-base mb-2">
                Are you sure you want to delete this? All historical data will
                be deleted as well.
              </p>
              <div className="flex -sm justify-between">
                <button
                  className="rounded py-1 px-1.5 bg-neutral-800 text-neutral-200"
                  onClick={async () => {
                    await onDeleteCredential(confirmDeletionCredential);
                    setPopup({
                      message: "Swapped credential",
                      type: "success",
                    });
                    mutate(buildSimilarCredentialInfoURL(ccPair.credential.id));
                    setConfirmDeletionCredential(null);
                    setPopup({
                      message: "Credential deleted",
                      type: "success",
                    });
                  }}
                >
                  yes
                </button>
                <button className="rounded py-1 px-1.5 bg-neutral-200 text-neutral-800">
                  {" "}
                  no
                </button>
              </div>
            </>
          </Modal>
        )}

        <div className="mb-0">
          <Text className="mb-4 ">
            Swap credentials as needed! Ensure that you have selected a
            credential with the proper permissions for this connector!
          </Text>
          {credentials.length > 1 ? (
            <CredentialSelectionTable
              setPopup={setPopup}
              onDeleteCredential={async (
                credential: Credential<any | null>
              ) => {
                // await onDeleteCredential(credential);
                setConfirmDeletionCredential(credential);
              }}
              onEditCredential={(
                credential: Credential<ConfluenceCredentialJson>
              ) => onEditCredential(credential)}
              currentCredentialId={ccPair.credential.id}
              credentials={credentials}
              onSelectCredential={(credential: Credential<any> | null) =>
                handleSelectCredential(credential)
              }
            />
          ) : (
            <p className="text-lg">
              You have no additional {sourceName} credentials. Create a new one?
            </p>
          )}

          <div className="flex mt-8 justify-end">
            {credentials.length > 1 ? (
              <Button
                disabled={selectedCredential == null}
                onClick={() => {
                  onSwap(selectedCredential?.id!, ccPair.connector.id);
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
        </div>
      </>
    </Modal>
  );
}
