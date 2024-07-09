import React from "react";
import { Modal } from "@/components/Modal";
import { Button, Text } from "@tremor/react";

import { CloudEmbeddingProvider } from "../components/types";

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
          Heads up: {modelProvider.name} isn&apos;t configured yet. Do you want
          to configure this provider?
        </Text>
        <div className="flex mt-8 justify-between">
          <Button color="gray" onClick={onCancel}>
            Not now
          </Button>
          <Button color="blue" onClick={onConfirm}>
            Configure
          </Button>
        </div>
      </div>
    </Modal>
  );
}
