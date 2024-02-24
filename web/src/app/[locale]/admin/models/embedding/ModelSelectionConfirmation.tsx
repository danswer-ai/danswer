import { Modal } from "@/components/Modal";
import { Button, Text } from "@tremor/react";

export function ModelSelectionConfirmaion({
  selectedModel,
  onConfirm,
}: {
  selectedModel: string;
  onConfirm: () => void;
}) {
  return (
    <div className="mb-4">
      <Text className="text-lg mb-4">
        You have selected: <b>{selectedModel}</b>. Are you sure you want to
        update to this new embedding model?
      </Text>
      <Text className="text-lg mb-2">
        We will re-index all your documents in the background so you will be
        able to continue to use Danswer as normal with the old model in the
        meantime. Depending on how many documents you have indexed, this may
        take a while.
      </Text>
      <Text className="text-lg mb-2">
        <i>NOTE:</i> this re-indexing process will consume more resources than
        normal. If you are self-hosting, we recommend that you allocate at least
        16GB of RAM to Danswer during this process.
      </Text>
      <div className="flex mt-8">
        <Button className="mx-auto" color="green" onClick={onConfirm}>
          Confirm
        </Button>
      </div>
    </div>
  );
}

export function ModelSelectionConfirmaionModal({
  selectedModel,
  onConfirm,
  onCancel,
}: {
  selectedModel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title="Update Embedding Model" onOutsideClick={onCancel}>
      <div>
        <ModelSelectionConfirmaion
          selectedModel={selectedModel}
          onConfirm={onConfirm}
        />
      </div>
    </Modal>
  );
}
