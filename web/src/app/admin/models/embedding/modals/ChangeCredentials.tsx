import React, { useState } from "react";
import { Modal } from "@/components/Modal";
import { Button, Text, Callout, Subtitle, Divider } from "@tremor/react";
import { Label } from "@/components/admin/connectors/Field";
import { CloudEmbeddingProvider } from "../components/types";
import { EMBEDDING_PROVIDERS_ADMIN_URL } from "../../llm/constants";
import { LoadingAnimation } from "@/components/Loading";

export function ChangeCredentialsModal({
  provider,
  onConfirm,
  onCancel,
}: {
  provider: CloudEmbeddingProvider;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testError, setTestError] = useState<string>("");

  const handleSubmit = async () => {
    setIsTesting(true);
    setTestError("");

    try {
      const body = JSON.stringify({
        api_key: apiKey,
        provider: provider.name.toLowerCase().split(" ")[0],
        default_model_id: provider.name,
      });

      const testResponse = await fetch("/api/admin/llm/test-embedding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
      });

      if (!testResponse.ok) {
        const errorMsg = (await testResponse.json()).detail;
        throw new Error(errorMsg);
      }

      const updateResponse = await fetch(EMBEDDING_PROVIDERS_ADMIN_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: provider.name,
          api_key: apiKey,
          is_default_provider: false,
          is_configured: true,
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.detail || "Failed to update provider");
      }

      onConfirm();
    } catch (error) {
      setTestError(
        error instanceof Error ? error.message : "An unknown error occurred"
      );
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Modal
      icon={provider.icon}
      title={`Modify yor ${provider.name} key`}
      onOutsideClick={onCancel}
    >
      <div className="mb-4">
        <Subtitle className="mt-4 font-bold text-lg mb-2">
          Want to swap out your key?
        </Subtitle>
        <Text className="text-lg mb-2">
          Ready to play key swap with {provider.name}? Your old key is about to
          hit the bit bucket.
        </Text>
        <Callout title="Read the Fine Print" color="blue" className="mt-4">
          <div className="flex flex-col gap-y-2">
            <p>
              This isn&apos;t just a local change. Every model tied to this
              provider will feel the ripple effect.
            </p>
            <Label>Your Shiny New API Key</Label>
            <input
              type="password"
              className="text-lg w-full p-1"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your 1337 API key here"
            />
            <a
              href={provider.apiLink}
              target="_blank"
              rel="noopener noreferrer"
              className="underline cursor-pointer"
            >
              RTFM: {provider.name} API key edition
            </a>
          </div>
        </Callout>
        <Text className="text-sm mt-4">
          Fun fact: This key swap could save you up to 15% on your API calls. Or
          not. We&apos;re developers, not fortune tellers.
        </Text>

        {testError && (
          <Callout title="Error" color="red" className="mt-4">
            {testError}
          </Callout>
        )}

        <div className="flex mt-8 justify-between">
          <Button
            color="blue"
            onClick={() => handleSubmit()}
            disabled={!apiKey}
          >
            Execute Key Swap
          </Button>
        </div>
        <Divider />

        <Subtitle className="mt-4 font-bold text-lg mb-2">
          You can also delete your key.
        </Subtitle>
        <Text className="mb-2">
          This is only possible if you have already switched to a different
          embedding type!
        </Text>
        <Button color="red">Delete key</Button>
      </div>
    </Modal>
  );
}
