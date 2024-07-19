import { errorHandlingFetcher } from "@/lib/fetcher";

import React, { useState } from "react";
import { Modal } from "@/components/Modal";
import { Button, Text, Callout, Badge } from "@tremor/react";

import { buildSimilarCredentialInfoURL } from "./lib";
import useSWR, { mutate } from "swr";
import { ConfluenceCredentialJson, Credential } from "@/lib/types";
import { FaCreativeCommons, FaSwatchbook } from "react-icons/fa";
import { swapCredential } from "@/lib/credential";
import { EditIcon, SwapIcon, TrashIcon } from "@/components/icons/icons";

interface CredentialSelectionTableProps {
  credentials: Credential<any>[];
  onSelectCredential: (credential: Credential<any> | null) => void;
  currentCredentialId: number;
  onEditCredential: (credential: Credential<ConfluenceCredentialJson>) => void;
}

const CredentialSelectionTable: React.FC<CredentialSelectionTableProps> = ({
  credentials,
  onEditCredential,
  onSelectCredential,
  currentCredentialId,
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
          {credentials.map((credential, ind) => (
            <tr key={credential.id} className="border-b hover:bg-gray-50">
              <td className="p-2">
                {credential.id != currentCredentialId ? (
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
                <button className="cursor-pointer my-auto">
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
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function ModifyCredentialModal({
  id,
  onClose,
  connectorId,
  credentialId,
  onSwap,
  onCreateNew,
  onEditCredential,
}: {
  onEditCredential: (credential: Credential<ConfluenceCredentialJson>) => void;
  id: number;
  connectorId: number;
  credentialId: number;
  onClose: () => void;
  onSwap: (newCredentialId: number, connectorId: number) => void;
  onCreateNew: () => void;
}) {
  const [selectedCredential, setSelectedCredential] =
    React.useState<Credential<any> | null>(null);

  const handleSelectCredential = (credential: Credential<any> | null) => {
    setSelectedCredential(credential);
  };

  const {
    data: credentials,
    isLoading,
    error,
  } = useSWR<Credential<ConfluenceCredentialJson>[]>(
    buildSimilarCredentialInfoURL(id),
    errorHandlingFetcher,
    { refreshInterval: 5000 } // 5 seconds
  );
  if (!credentials) {
    onClose();
    return <></>;
  }
  const [loading, setLoading] = useState<boolean>(false);

  return (
    <Modal
      onOutsideClick={onClose}
      className="max-w-3xl rounded-lg"
      title={`Swap Confluence Credential`}
    >
      <div className="mb-0">
        <Text className="mb-4 ">
          Swap credentials as needed! Ensure that you have selected a credential
          with the proper permissions for this connector!
        </Text>
        {credentials.length > 1 ? (
          <CredentialSelectionTable
            onEditCredential={onEditCredential}
            currentCredentialId={credentialId}
            credentials={credentials}
            onSelectCredential={handleSelectCredential}
          />
        ) : (
          <p className="text-lg">
            You have no additional Confluence credentials. Create a new one?
          </p>
        )}

        <div className="flex mt-8 justify-end">
          {credentials.length > 1 ? (
            <Button
              disabled={selectedCredential == null}
              onClick={() => onSwap(selectedCredential.id, connectorId)}
              className="bg-indigo-500 disabled:border-transparent transition-colors duration-150 ease-in disabled:bg-indigo-300 disabled:hover:bg-indigo-300 hover:bg-indigo-600 cursor-pointer"
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
    </Modal>
  );
}
