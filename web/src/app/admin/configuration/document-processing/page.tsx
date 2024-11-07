"use client";

import { useState } from "react";
import { DocumentIcon2 } from "@/components/icons/icons";
import useSWR from "swr";
import { ThreeDotsLoader } from "@/components/Loading";
import { AdminPageTitle } from "@/components/admin/Title";
import { Lock } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

function Main() {
  const {
    data: isApiKeySet,
    error,
    mutate,
    isLoading,
  } = useSWR<{
    unstructured_api_key: string | null;
  }>("/api/search-settings/unstructured-api-key-set", (url: string) =>
    fetch(url).then((res) => res.json())
  );

  const [apiKey, setApiKey] = useState("");

  const handleSave = async () => {
    try {
      await fetch(
        `/api/search-settings/upsert-unstructured-api-key?unstructured_api_key=${apiKey}`,
        {
          method: "PUT",
        }
      );
    } catch (error) {
      console.error("Failed to save API key:", error);
    }
    mutate();
  };

  const handleDelete = async () => {
    try {
      await fetch("/api/search-settings/delete-unstructured-api-key", {
        method: "DELETE",
      });
      setApiKey("");
    } catch (error) {
      console.error("Failed to delete API key:", error);
    }
    mutate();
  };

  if (isLoading) {
    return <ThreeDotsLoader />;
  }
  return (
    <div className="container p-4 mx-auto">
      <Card>
        <CardContent>
          <h3 className="pb-2 mb-4 text-2xl font-bold border-b text-text-800 text-text border-b-border">
            Process with Unstructured API
          </h3>

          <div className="space-y-4">
            <p className="text-text-600">
              Unstructured extracts and transforms complex data from formats
              like .pdf, .docx, .png, .pptx, etc. into clean text for enMedD AI
              to ingest. Provide an API key to enable Unstructured document
              processing.
              <br />
              <br /> <strong>Note:</strong> this will send documents to
              Unstructured servers for processing.
            </p>
            <p className="text-text-600">
              Learn more about Unstructured{" "}
              <a
                href="https://unstructured.io/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-500 hover:underline"
              >
                here
              </a>
              .
            </p>
            <div className="mt-4">
              {isApiKeySet ? (
                <div className="flex items-center w-full p-3 border rounded-md bg-background text-text">
                  <span className="flex-grow">••••••••••••••••</span>
                  <Lock className="w-5 h-5 text-gray-400" />
                </div>
              ) : (
                <Input
                  type="text"
                  placeholder="Enter API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              )}
            </div>
            <div className="flex mt-6 space-x-4">
              {isApiKeySet ? (
                <>
                  <Button variant="destructive" onClick={handleDelete}>
                    Delete API Key
                  </Button>
                  <p className="my-auto text-text-600">
                    Delete the current API key before updating.
                  </p>
                </>
              ) : (
                <Button onClick={handleSave}>Save API Key</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Page() {
  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="container mx-auto">
        <AdminPageTitle
          title="Document Processing"
          icon={<DocumentIcon2 size={32} className="my-auto" />}
        />
        <Main />
      </div>
    </div>
  );
}

export default Page;
