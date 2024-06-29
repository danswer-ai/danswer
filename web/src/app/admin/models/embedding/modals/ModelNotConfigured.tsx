import React from "react";
import { Modal } from "@/components/Modal";
import { Button, Text } from "@tremor/react";

import { CloudEmbeddingProvider } from "../components/types";

// 1. Model Provider Not Configured
export function ModelNotConfiguredModal({
  modelProvider,
  onConfirm,
  onCancel,
}: {
  modelProvider: CloudEmbeddingProvider;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      icon={modelProvider.icon}
      title={`${modelProvider.name} Configuration Required`}
      onOutsideClick={onCancel}
    >
      <div className="mb-4">
        <Text className="text-lg mb-2">
          Heads up: {modelProvider.name} isn&apos;t configured yet. Want to
          unleash its potential now?
        </Text>
        <Text className="text-sm mb-2">
          Pro tip: Setting this up now could save you 30% on compute costs. Your
          future self will thank you.
        </Text>
        <div className="flex mt-8 justify-between">
          <Button color="gray" onClick={onCancel}>
            Maybe Later
          </Button>
          <Button color="blue" onClick={onConfirm}>
            Let&apos;s Do This
          </Button>
        </div>
      </div>
    </Modal>
  );
}
