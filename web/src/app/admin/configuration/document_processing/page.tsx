"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "@tremor/react";
import { AdminPageTitle } from "@/components/admin/Title";
import { DocumentSetIconSkeleton } from "@/components/icons/icons";
import useSWR from "swr";
const fetcher = (url: string) => fetch(url).then((res) => res.json());

function Main() {
  const { data, error, mutate } = useSWR<{
    unstructured_api_key: string | null;
  }>("/api/admin/get-unstructured-api-key", fetcher);

  const [apiKey, setApiKey] = useState(data?.unstructured_api_key || "");
  const [isApiKeySet, setIsApiKeySet] = useState(!!data?.unstructured_api_key);

  useEffect(() => {
    if (data) {
      setApiKey(data.unstructured_api_key || "");
      setIsApiKeySet(!!data.unstructured_api_key);
    }
  }, [data]);

  const handleSave = async () => {
    try {
      await fetch("/api/admin/upsert-unstructured-api-key", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ unstructured_api_key: apiKey }),
      });
      setIsApiKeySet(true);
    } catch (error) {
      console.error("Failed to save API key:", error);
    }
  };

  const handleDelete = async () => {
    try {
      await fetch("/api/admin/delete-unstructured-api-key", {
        method: "DELETE",
      });
      setApiKey("");
      setIsApiKeySet(false);
    } catch (error) {
      console.error("Failed to delete API key:", error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-8 max-w-2xl bg-background-50 text-text shadow-lg rounded-lg">
        <h3 className="text-2xl font-bold mb-4 text-text border-b border-b-border pb-2">
          Unstructured API Integration
        </h3>

        <div className="space-y-4">
          <p className="text-text-600">
            Enter an API key for unstructured document processing. If not set,
            document processing will continue as normal.
          </p>
          <p className="text-text-600">
            Learn more about Unstructured{" "}
            <a
              href="https://unstructured.io/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline font-medium"
            >
              here
            </a>
            .
          </p>
          <div className="mt-4">
            <input
              type="text"
              placeholder="Enter API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full p-3 border rounded-md bg-background text-text focus:ring-2 focus:ring-blue-500 transition duration-200"
            />
          </div>
          <div className="flex space-x-4 mt-6">
            <Button
              onClick={handleSave}
              className="bg-blue-500 text-white hover:bg-blue-600 transition duration-200"
            >
              {isApiKeySet ? "Update API Key" : "Save API Key"}
            </Button>
            {isApiKeySet && (
              <Button
                color="red"
                onClick={handleDelete}
                variant="secondary"
                className="bg-red-100 text-red-600 hover:bg-red-400 transition duration-200"
              >
                Delete API Key
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function Page() {
  return (
    <div className="mx-auto container">
      <AdminPageTitle
        title="Document Processing"
        icon={<DocumentSetIconSkeleton size={32} className="my-auto" />}
      />
      <Main />
    </div>
  );
}

export default Page;
