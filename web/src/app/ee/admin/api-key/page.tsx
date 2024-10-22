"use client";

import { ThreeDotsLoader } from "@/components/Loading";
import { AdminPageTitle } from "@/components/admin/Title";
import { KeyIcon } from "@/components/icons/icons";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { ErrorCallout } from "@/components/ErrorCallout";
import useSWR, { mutate } from "swr";
import { Spinner } from "@/components/Spinner";
import { deleteApiKey, regenerateApiKey } from "./lib";
import { Button } from "@/components/ui/button";
import { usePopup } from "@/components/admin/connectors/Popup";
import { useState } from "react";
import { Table, Title } from "@tremor/react";
import { DeleteButton } from "@/components/DeleteButton";
import { FiCopy, FiEdit2, FiRefreshCw, FiX } from "react-icons/fi";
import { Modal } from "@/components/Modal";
import { EnmeddApiKeyForm } from "./EnmeddApiKeyForm";
import { APIKey } from "./types";
import { CustomTooltip } from "@/components/CustomTooltip";
import { Check, Copy, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CustomModal } from "@/components/CustomModal";
import { Divider } from "@/components/Divider";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

const API_KEY_TEXT = `
API Keys allow you to access enMedD AI APIs programmatically. Click the button below to generate a new API Key.
`;

function NewApiKeyModal({
  apiKey,
  onClose,
}: {
  apiKey: string;
  onClose: () => void;
}) {
  const [isCopyClicked, setIsCopyClicked] = useState(false);

  return (
    <div className="h-full">
      <div>
        <p className="pb-4">
          Make sure you copy your new API key. You won’t be able to see this key
          again.
        </p>

        <div className="flex pt-2 pb-10">
          <b className="my-auto break-all">{apiKey}</b>
          <CustomTooltip
            trigger={
              <Button
                onClick={() => {
                  setIsCopyClicked(true);
                  navigator.clipboard.writeText(apiKey);
                  setTimeout(() => {
                    setIsCopyClicked(false);
                  }, 2000);
                }}
                variant="ghost"
                size="icon"
                className="ml-2"
              >
                {isCopyClicked ? <Check size="16" /> : <Copy size="16" />}
              </Button>
            }
            asChild
          >
            {isCopyClicked ? "Copied" : "Copy"}
          </CustomTooltip>
        </div>
        {isCopyClicked && (
          <p className="pt-1 text-xs font-medium text-success">
            API Key copied!
          </p>
        )}
      </div>
    </div>
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
  const [showCreateUpdateForm, setShowCreateUpdateForm] = useState(false);
  const [selectedApiKey, setSelectedApiKey] = useState<APIKey | undefined>();

  const handleEdit = (apiKey: APIKey) => {
    setSelectedApiKey(apiKey);
    setShowCreateUpdateForm(true);
  };

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
    <Button className="mt-3" onClick={() => setShowCreateUpdateForm(true)}>
      Create API Key
    </Button>
  );

  if (apiKeys.length === 0) {
    return (
      <div>
        {popup}
        <p>{API_KEY_TEXT}</p>
        {newApiKeyButton}

        {showCreateUpdateForm && (
          <EnmeddApiKeyForm
            onCreateApiKey={(apiKey) => {
              setFullApiKey(apiKey.api_key);
            }}
            onClose={() => {
              setShowCreateUpdateForm(false);
              setSelectedApiKey(undefined);
              mutate("/api/admin/api-key");
            }}
            setPopup={setPopup}
            apiKey={selectedApiKey}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      {popup}

      {fullApiKey && (
        <NewApiKeyModal
          apiKey={fullApiKey}
          onClose={() => setFullApiKey(null)}
        />
      )}

      {keyIsGenerating && <Spinner />}

      <p>{API_KEY_TEXT}</p>
      {newApiKeyButton}

      <Divider />

      <h3 className="pb-4 mt-6">Existing API Keys</h3>
      <Card>
        <CardContent className="p-0">
          <Table className="overflow-visible">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>API Key</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Regenerate</TableHead>
                <TableHead>Delete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((apiKey) => (
                <TableRow key={apiKey.api_key_id}>
                  <TableCell className="max-w-[200px] truncate">
                    <Button
                      variant="ghost"
                      className="w-full truncate"
                      onClick={() => handleEdit(apiKey)}
                    >
                      <Pencil size={14} />
                      {apiKey.api_key_name || <i>null</i>}
                    </Button>
                  </TableCell>
                  <TableCell className="max-w-64">
                    {apiKey.api_key_display}
                  </TableCell>
                  <TableCell className="max-w-64">
                    {apiKey.api_key_role.toUpperCase()}
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
                        const response = await regenerateApiKey(apiKey);
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
                      <FiRefreshCw className="my-auto mr-1" />
                      Refresh
                    </div>
                  </TableCell>
                  <TableCell>
                    <DeleteButton
                      onClick={async () => {
                        const response = await deleteApiKey(apiKey.api_key_id);
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
        </CardContent>
      </Card>

      {showCreateUpdateForm && (
        <EnmeddApiKeyForm
          onCreateApiKey={(apiKey) => {
            setFullApiKey(apiKey.api_key);
          }}
          onClose={() => {
            setShowCreateUpdateForm(false);
            setSelectedApiKey(undefined);
            mutate("/api/admin/api-key");
          }}
          setPopup={setPopup}
          apiKey={selectedApiKey}
        />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <div className="container mx-auto">
      <AdminPageTitle title="API Keys" icon={<KeyIcon size={32} />} />

      <Main />
    </div>
  );
}
