import { Modal } from "@/components/Modal";
import { Button, Text, Callout } from "@tremor/react";
import { AIProvider, EmbeddingModelDescriptor, FullCloudbasedEmbeddingModelDescriptor } from "./embeddingModels";
import { Label } from "@/components/admin/connectors/Field";

export function ModelSelectionConfirmation({
  selectedModel,
  isCustom,
  onConfirm,
}: {
  selectedModel: EmbeddingModelDescriptor | FullCloudbasedEmbeddingModelDescriptor;
  isCustom: boolean;
  onConfirm: () => void;
}) {
  if (selectedModel?.query_prefix == "") {
    console.log('hi')
  }
  return (

    <div className="mb-4">
      <Text className="text-lg mb-4">
        You have selected: <b>{selectedModel.model_name}</b>. Are you sure you
        want to update to this new embedding model?
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




      {/* TODO Change this back- ensure functional */}
      {!isCustom && (
        <Callout title="IMPORTANT" color="yellow" className="mt-4">
          We&apos;ve detected that this is a custom-specified embedding model.
          Since we have to download the model files before verifying the
          configuration&apos;s correctness, we won&apos;t be able to let you
          know if the configuration is valid until <b>after</b> we start
          re-indexing your documents. If there is an issue, it will show up on
          this page as an indexing error on this page after clicking Confirm.
        </Callout>
      )}

      <div className="flex mt-8">
        <Button className="mx-auto" color="green" onClick={onConfirm}>
          Confirm
        </Button>
      </div>
    </div>
  );
}

export function ModelSelectionConfirmationModal({
  selectedModel,
  isCustom,
  onConfirm,
  onCancel,
}: {
  selectedModel: EmbeddingModelDescriptor;
  isCustom: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title="Update Embedding Model" onOutsideClick={onCancel}>
      <div>
        <ModelSelectionConfirmation
          selectedModel={selectedModel}
          isCustom={isCustom}
          onConfirm={onConfirm}
        />
      </div>
    </Modal>
  );
}


export function ProviderCreation({
  selectedProvider,
  onConfirm,
}: {
  selectedProvider: AIProvider;
  onConfirm: () => void;
}) {

  return (
    <div className="mb-4">

      <Text className="text-lg mb-2">
        You are setting the credentials for this provider. To access this information, follow the instructions <a className="cursor-pointer underline" target="_blank" href={selectedProvider.apiLink}>here</a>  and gather your "API KEY".
      </Text>

      <p>
        Please note that using this will cost around $4000! Learn more about costs at <a>this page</a>.
      </p>

      <Callout title="IMPORTANT" color="blue" className="mt-4 ">
        <div className="flex flex-col gap-y-2">
          You will need to retrieve your API credentials for this updates.
          <Label>API Key</Label>
          <input type="password" className="text-lg  w-full p-1" />
          <a href={selectedProvider.apiLink} target="_blank" className="underline cursor-pointer">
            Learn more here
          </a>
        </div>
      </Callout>

      <div className="flex mt-8">
        <Button className="mx-auto" color="green" onClick={onConfirm}>
          Confirm
        </Button>
      </div>
    </div>
  );
}

export function ProviderCreationModal({
  selectedProvider,
  onConfirm,
  onCancel,
}: {
  selectedProvider: AIProvider;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={`Configure ${selectedProvider.name}`} onOutsideClick={onCancel}>
      <div>
        <ProviderCreation
          selectedProvider={selectedProvider}
          onConfirm={onConfirm}
        />
      </div>
    </Modal>
  );
}

