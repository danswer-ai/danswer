"use client";

import { ThreeDotsLoader } from "@/components/Loading";
import { AdminPageTitle } from "@/components/admin/Title";
import { KeyIcon } from "@/components/icons/icons";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { ErrorCallout } from "@/components/ErrorCallout";
import useSWR, { mutate } from "swr";
import { Divider } from "@tremor/react";
import { useState } from "react";
import { DeleteButton } from "@/components/DeleteButton";
import { FiCopy, FiEdit2, FiRefreshCw, FiX } from "react-icons/fi";
import { Modal } from "@/components/Modal";
import { Spinner } from "@/components/Spinner";
import { deleteApiKey, regenerateApiKey } from "./lib";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EnmeddApiKeyForm } from "./EnmeddApiKeyForm";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Edit2, RefreshCw } from "lucide-react";
import { CustomModal } from "@/components/CustomModal";

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
  const [copyClicked, setCopyClicked] = useState(false);

  return (
    <div className="h-full">
      <div className="flex w-full border-b border-border mb-4 pb-4">
        <h3 className="font-semibold">New API Key</h3>
      </div>
      <div>
        <p className="pb-4">
          Make sure you copy your new API key. You won’t be able to see this key
          again.
        </p>

        <div className="flex pt-2 pb-10">
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
          <p className="text-success text-xs font-medium pt-1">
            API Key copied!
          </p>
        )}
      </div>
    </div>
  );
}

function Main() {
  const {
    data: apiKeys,
    isLoading,
    error,
  } = useSWR<APIKey[]>("/api/admin/api-key", errorHandlingFetcher);

  const [fullApiKey, setFullApiKey] = useState<string | null>(null);
  const [keyIsGenerating, setKeyIsGenerating] = useState(false);
  const [showCreateUpdateForm, setShowCreateUpdateForm] = useState(false);
  const [selectedApiKey, setSelectedApiKey] = useState<APIKey | undefined>();
  const { toast } = useToast();

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
    <Button onClick={() => setShowCreateUpdateForm(true)}>
      Create API Key
    </Button>
  );

  if (apiKeys.length === 0) {
    return (
      <div>
        <p className="pb-5">{API_KEY_TEXT}</p>

        <CustomModal
          trigger={newApiKeyButton}
          onClose={() => setShowCreateUpdateForm(false)}
          open={showCreateUpdateForm}
        >
          <EnmeddApiKeyForm
            onCreateApiKey={(apiKey) => setFullApiKey(apiKey.api_key)}
            onClose={() => {
              setShowCreateUpdateForm(false);
              setSelectedApiKey(undefined);
              mutate("/api/admin/api-key");
            }}
            apiKey={selectedApiKey}
          />
        </CustomModal>
      </div>
    );
  }

  return (
    <div>
      {fullApiKey && (
        <CustomModal
          trigger={null}
          onClose={() => setFullApiKey(null)}
          open={Boolean(fullApiKey)}
        >
          <NewApiKeyModal
            apiKey={fullApiKey}
            onClose={() => setFullApiKey(null)}
          />
        </CustomModal>
      )}

      {keyIsGenerating && <Spinner />}

      <p className="pb-5">{API_KEY_TEXT}</p>

      <CustomModal
        trigger={newApiKeyButton}
        onClose={() => setShowCreateUpdateForm(false)}
        open={showCreateUpdateForm}
      >
        <EnmeddApiKeyForm
          onCreateApiKey={(apiKey) => setFullApiKey(apiKey.api_key)}
          onClose={() => {
            setShowCreateUpdateForm(false);
            setSelectedApiKey(undefined);
            mutate("/api/admin/api-key");
          }}
          apiKey={selectedApiKey}
        />
      </CustomModal>

      <Divider />

      <h3 className="font-semibold pb-4">Existing API Keys</h3>
      <Card>
        <CardContent className="p-0">
          <Table className="overflow-visible">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>API Key</TableHead>
                <TableHead>Regenerate</TableHead>
                <TableHead>Delete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((apiKey) => (
                <TableRow key={apiKey.api_key_id}>
                  <TableCell>
                    <Button variant="ghost" onClick={() => handleEdit(apiKey)}>
                      <Edit2 size={14} />
                      {apiKey.api_key_name || <i>null</i>}
                    </Button>
                  </TableCell>
                  <TableCell className="max-w-64">
                    {apiKey.api_key_display}
                  </TableCell>
                  <TableCell>
                    <Button
                      onClick={async () => {
                        setKeyIsGenerating(true);
                        const response = await regenerateApiKey(apiKey);
                        setKeyIsGenerating(false);
                        if (!response.ok) {
                          const errorMsg = await response.text();
                          toast({
                            title: "Error",
                            description: `Failed to regenerate API Key: ${errorMsg}`,
                            variant: "destructive",
                          });
                          return;
                        }
                        const newKey = (await response.json()) as APIKey;
                        setFullApiKey(newKey.api_key);
                        mutate("/api/admin/api-key");
                      }}
                      variant="ghost"
                    >
                      <RefreshCw size={16} />
                      Refresh
                    </Button>
                  </TableCell>
                  <TableCell>
                    <DeleteButton
                      onClick={async () => {
                        const response = await deleteApiKey(apiKey.api_key_id);
                        if (!response.ok) {
                          const errorMsg = await response.text();
                          toast({
                            title: "Error",
                            description: `Failed to delete API Key: ${errorMsg}`,
                            variant: "destructive",
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
    </div>
  );
}

export default function Page() {
  return (
    <div className="py-24 md:py-32 lg:pt-16">
      <AdminPageTitle title="API Keys" icon={<KeyIcon size={32} />} />

      <Main />
    </div>
  );
}
