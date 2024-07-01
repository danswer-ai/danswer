import React from "react";
import { Modal } from "@/components/Modal";
import { Button, Text, Callout } from "@tremor/react";

import {
  CloudEmbeddingModel,
  CloudEmbeddingProvider,
  FullEmbeddingModelDescriptor,
} from "../components/types";

// 3. Change Model
export function ChangeModelModal({
  existingModel,
  newModel,
  onConfirm,
  onCancel,
}: {
  existingModel: FullEmbeddingModelDescriptor | CloudEmbeddingModel;
  newModel: CloudEmbeddingModel;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title="Model Swap: Upgrade or Sidegrade?" onOutsideClick={onCancel}>
      <div className="mb-4">
        <Text className="text-lg mb-2">
          You&apos;re about to trade in your {existingModel.model_dim} for a
          shiny new {newModel.model_name}. Bold move.
        </Text>
        <Callout title="New Hotness Specs" color="blue" className="mt-4">
          <div className="flex flex-col gap-y-2">
            <p>Elevator pitch: {newModel.description}</p>
            <p>
              Dimensions: {newModel.model_dim} (That&apos;s a{" "}
              {Math.abs(newModel.model_dim - existingModel.model_dim)} dimension{" "}
              {newModel.model_dim > existingModel.model_dim
                ? "upgrade"
                : "downgrade"}
              )
            </p>
            {/* <p>Cost delta: ${(newModel?.pricePerMillion! - existingModel?.pricePerMillion!).toFixed(3)}/million tokens (Could save/cost you ~$100/month)</p> */}
          </div>
        </Callout>
        <div className="flex mt-8 justify-between">
          <Button color="gray" onClick={onCancel}>
            Stick with Old Reliable
          </Button>
          <Button color="green" onClick={onConfirm}>
            Embrace the Future
          </Button>
        </div>
      </div>
    </Modal>
  );
}
