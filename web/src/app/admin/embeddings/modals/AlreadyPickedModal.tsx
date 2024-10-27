import React from "react";
import { Modal } from "@/components/Modal";
import { Button, Text } from "@tremor/react";

import { CloudEmbeddingModel } from "../../../../components/embedding/interfaces";
import { CustomModal } from "@/components/CustomModal";

export function AlreadyPickedModal({
  model,
  onClose,
}: {
  model: CloudEmbeddingModel;
  onClose: () => void;
}) {
  return (
    <CustomModal
      title={`${model.model_name} already chosen`}
      onClose={onClose}
      open={!!model}
      trigger={null}
    >
      <div className="mb-4">
        <Text className="text-sm mb-2">
          You can select a different one if you want
        </Text>
        <div className="flex mt-8 justify-between">
          <Button color="blue" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </CustomModal>
  );
}
