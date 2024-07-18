import { errorHandlingFetcher } from "@/lib/fetcher";

import React, { useState } from "react";
import { Modal } from "@/components/Modal";
import { Button, Text, Callout, Badge } from "@tremor/react";

import { buildSimilarCredentialInfoURL } from "./lib";
import useSWR from "swr";
import { ConfluenceCredentialJson, Credential } from "@/lib/types";
import { FaCreativeCommons, FaSwatchbook } from "react-icons/fa";

interface CredentialSelectionTableProps {
  credentials: Credential<any>[];
  onSelectCredential: (credential: Credential<any> | null) => void;
}

const CredentialSelectionTable: React.FC<CredentialSelectionTableProps> = ({
  credentials,
  onSelectCredential,
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
            <th className="p-2 text-left font-medium text-gray-600">
              Admin Public
            </th>
            <th className="p-2 text-left font-medium text-gray-600">Created</th>
            <th className="p-2 text-left font-medium text-gray-600">Updated</th>
          </tr>
        </thead>
        <tbody>
          {credentials.map((credential, ind) => (
            <tr key={credential.id} className="border-b hover:bg-gray-50">
              <td className="p-2">
                {ind != 0 ? (
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
              <td className="p-2">{credential.admin_public ? "Yes" : "No"}</td>
              <td className="p-2">
                {new Date(credential.time_created).toLocaleString()}
              </td>
              <td className="p-2">
                {new Date(credential.time_updated).toLocaleString()}
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
  onSwap,
  onCreateNew,
}: {
  id: number;
  onClose: () => void;
  onSwap: (selectedCredential: Credential<ConfluenceCredentialJson>) => void;
  onCreateNew: () => void;
}) {
  const [selectedCredential, setSelectedCredential] =
    React.useState<Credential<any> | null>(null);

  const handleSelectCredential = (credential: Credential<any> | null) => {
    setSelectedCredential(credential);
    console.log("Selected credential:", credential);
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
  console.log(credentials);

  return (
    <Modal className="max-w-2xl rounded-lg" title={`Swap Credential`}>
      <div className="mb-4">
        {credentials.length > 1 ? (
          <CredentialSelectionTable
            credentials={credentials}
            onSelectCredential={handleSelectCredential}
          />
        ) : (
          <p className="text-lg">
            You have no additional Confluence credentials. Create a new one?
          </p>
        )}

        <div className="flex mt-8 justify-between">
          <Button
            className="bg-teal-500 hover:bg-teal-400 border-none"
            onClick={onClose}
          >
            Exit
          </Button>
          {credentials.length > 1 ? (
            <Button className="bg-indigo-500 hover:bg-indigo-400">
              <div className="flex gap-x-2 items-center w-full border-none">
                <FaSwatchbook />
                <p>Swap</p>
              </div>
            </Button>
          ) : (
            <Button
              onClick={onCreateNew}
              className="bg-indigo-500 hover:bg-indigo-400"
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
