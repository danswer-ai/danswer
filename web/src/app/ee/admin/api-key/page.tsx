"use client";

import { ThreeDotsLoader } from "@/components/Loading";
import { AdminPageTitle } from "@/components/admin/Title";
import { KeyIcon } from "@/components/icons/icons";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { ErrorCallout } from "@/components/ErrorCallout";
import useSWR, { mutate } from "swr";
import {
  Button,
  Divider,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  Title,
} from "@tremor/react";
import { usePopup } from "@/components/admin/connectors/Popup";
import { useState } from "react";
import { Table } from "@tremor/react";
import { DeleteButton } from "@/components/DeleteButton";
import { FiCopy, FiRefreshCw, FiX } from "react-icons/fi";
import { Modal } from "@/components/Modal";
import { Spinner } from "@/components/Spinner";

interface APIKey {
  api_key_id: number;
  api_key_display: string;
  api_key: string | null; // only present on initial creation
  user_id: string;
}

const API_KEY_TEXT = `
API Keys allow you to access Danswer APIs programmatically. Click the button below to generate a new API Key.
`;

function NewApiKeyModal({
  apiKey,
  onClose,
}: {
  apiKey: string;
  onClose: () => void;
}) {
  const [copyClicked, setCopyClicked] = useState(false);

  return (
    <Modal onOutsideClick={onClose}>
      <div className="px-8 py-8">
        <div className="flex w-full border-b border-border mb-4 pb-4">
          <Title>New API Key</Title>
          <div onClick={onClose} className="ml-auto p-1 rounded hover:bg-hover">
            <FiX size={18} />
          </div>
        </div>
        <div className="h-32">
          <Text className="mb-4">
            Make sure you copy your new API key. You won’t be able to see this
            key again.
          </Text>

          <div className="flex mt-2">
            <b className="my-auto break-all">{apiKey}</b>
            <div
              className="ml-2 my-auto p-2 hover:bg-hover rounded cursor-pointer"
              onClick={() => {
                setCopyClicked(true);
                navigator.clipboard.writeText(apiKey);
                setTimeout(() => {
                  setCopyClicked(false);
                }, 10000);
              }}
            >
              <FiCopy size="16" className="my-auto" />
            </div>
          </div>
          {copyClicked && (
            <Text className="text-success text-xs font-medium mt-1">
              API Key copied!
            </Text>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Main() {
  const { popup, setPopup } = usePopup();

  const {
    data: apiKeys,
    isLoading,
    error,
  } = useSWR<APIKey[]>("/api/admin/api-key", errorHandlingFetcher);

  const [fullApiKey, setFullApiKey] = useState<string | null>(null);
  const [keyIsGenerating, setKeyIsGenerating] = useState(false);

  if (isLoading) {
    return <ThreeDotsLoader />;
  }

  if (!apiKeys || error) {
    return (
      <ErrorCallout
        errorTitle="Failed to fetch API Keys"
        errorMsg={error?.info?.detail || error.toString()}
      />
    );
  }

  const newApiKeyButton = (
    <Button
      color="green"
      size="xs"
      className="mt-3"
      onClick={async () => {
        setKeyIsGenerating(true);
        const response = await fetch("/api/admin/api-key", {
          method: "POST",
        });
        setKeyIsGenerating(false);
        if (!response.ok) {
          const errorMsg = await response.text();
          setPopup({
            type: "error",
            message: `Failed to create API Key: ${errorMsg}`,
          });
          return;
        }
        const newKey = (await response.json()) as APIKey;
        setFullApiKey(newKey.api_key);
        mutate("/api/admin/api-key");
      }}
    >
      Create API Key
    </Button>
  );

  if (apiKeys.length === 0) {
    return (
      <div>
        {popup}
        <Text>{API_KEY_TEXT}</Text>
        {newApiKeyButton}
      </div>
    );
  }

  return (
    <div>
      {fullApiKey && (
        <NewApiKeyModal
          apiKey={fullApiKey}
          onClose={() => setFullApiKey(null)}
        />
      )}

      {keyIsGenerating && <Spinner />}

      <Text>{API_KEY_TEXT}</Text>
      {newApiKeyButton}

      <Divider />

      <Title className="mt-6">Existing API Keys</Title>
      <Table className="overflow-visible">
        <TableHead>
          <TableRow>
            <TableHeaderCell>API Key</TableHeaderCell>
            <TableHeaderCell>Regenerate</TableHeaderCell>
            <TableHeaderCell>Delete</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {apiKeys.map((apiKey) => (
            <TableRow key={apiKey.api_key_id}>
              <TableCell className="max-w-64">
                {apiKey.api_key_display}
              </TableCell>
              <TableCell>
                <div
                  className={`
                  my-auto 
                  flex 
                  mb-1 
                  w-fit 
                  hover:bg-hover cursor-pointer
                  p-2 
                  rounded-lg
                  border-border
                  text-sm`}
                  onClick={async () => {
                    setKeyIsGenerating(true);
                    const response = await fetch(
                      `/api/admin/api-key/${apiKey.api_key_id}`,
                      {
                        method: "PATCH",
                      }
                    );
                    setKeyIsGenerating(false);
                    if (!response.ok) {
                      const errorMsg = await response.text();
                      setPopup({
                        type: "error",
                        message: `Failed to regenerate API Key: ${errorMsg}`,
                      });
                      return;
                    }
                    const newKey = (await response.json()) as APIKey;
                    setFullApiKey(newKey.api_key);
                    mutate("/api/admin/api-key");
                  }}
                >
                  <FiRefreshCw className="mr-1 my-auto" />
                  Refresh
                </div>
              </TableCell>
              <TableCell>
                <DeleteButton
                  onClick={async () => {
                    const response = await fetch(
                      `/api/admin/api-key/${apiKey.api_key_id}`,
                      {
                        method: "DELETE",
                      }
                    );
                    if (!response.ok) {
                      const errorMsg = await response.text();
                      setPopup({
                        type: "error",
                        message: `Failed to delete API Key: ${errorMsg}`,
                      });
                      return;
                    }
                    mutate("/api/admin/api-key");
                  }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function Page() {
  return (
    <div className="mx-auto container">
      <AdminPageTitle title="API Keys" icon={<KeyIcon size={32} />} />

      <Main />
    </div>
  );
}
