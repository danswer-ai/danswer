import { DefaultDropdown, StringOrNumberOption } from "@/components/Dropdown";
import { Title, Text } from "@tremor/react";
import { FullEmbeddingModelDescriptor } from "./embeddingModels";
import { FiStar } from "react-icons/fi";

export function ModelOption({
  model,
  onSelect,
}: {
  model: FullEmbeddingModelDescriptor;
  onSelect?: (modelName: string) => void;
}) {
  return (
    <div
      className={
        "p-2 border border-border dark:border-neutral-900 rounded shadow-md bg-hover-light dark:bg-neutral-600 w-96 flex flex-col"
      }
    >
      <div className="font-bold text-lg flex">
        {model.isDefault && <FiStar className="my-auto mr-1 text-accent" />}
        {model.model_name}
      </div>
      <div className="text-sm mt-1 mx-1">{model.description}</div>
      {model.link && (
        <a
          target="_blank"
          href={model.link}
          className="text-xs text-link dark:text-blue-300 mx-1 mt-1"
        >
          See More Details
        </a>
      )}
      {onSelect && (
        <div
          className={`
            m-auto 
            flex
            mb-1 
            w-fit 
            p-2 
            rounded-lg
            bg-background dark:bg-neutral-800
            border
            border-border dark:border-neutral-900
            cursor-pointer
            hover:bg-hover
            text-sm
            mt-auto dark:hover:bg-neutral-800`}
          onClick={() => onSelect(model.model_name)}
        >
          Select Model
        </div>
      )}
    </div>
  );
}

export function ModelSelector({
  modelOptions,
  setSelectedModel,
}: {
  modelOptions: FullEmbeddingModelDescriptor[];
  setSelectedModel: (modelName: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-4">
      {modelOptions.map((modelOption) => (
        <ModelOption
          key={modelOption.model_name}
          model={modelOption}
          onSelect={setSelectedModel}
        />
      ))}
    </div>
  );
}
