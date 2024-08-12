import { OpenSourceIcon } from "@/components/icons/icons";
import { EmbeddingModelDescriptor, HostedEmbeddingModel } from "./types";
import { FiExternalLink, FiStar } from "react-icons/fi";

export function ModelPreview({
  model,
  display,
}: {
  model: EmbeddingModelDescriptor;
  display?: boolean;
}) {
  return (
    <div
      className={` border border-border rounded shadow-md ${display ? "bg-inverted rounded-lg p-4" : "bg-hover-light p-2"} w-96 flex flex-col`}
    >
      <div className="font-bold text-lg flex">{model.model_name}</div>
      <div className="text-sm mt-1 mx-1">
        {model.description
          ? model.description
          : "Custom model—no description is available."}
      </div>
    </div>
  );
}

export function ModelOption({
  model,
  onSelect,
  selected,
}: {
  model: HostedEmbeddingModel;
  onSelect?: (model: HostedEmbeddingModel) => void;
  selected: boolean;
}) {
  return (
    <div
      className={`p-4 w-96 border rounded-lg transition-all duration-200 ${
        selected
          ? "border-blue-500 bg-blue-50 shadow-md"
          : "border-gray-200 hover:border-blue-300 hover:shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          {model.isDefault ? (
            <FiStar className="mr-2 text-accent" size={24} />
          ) : (
            <OpenSourceIcon size={24} className="mr-2" />
          )}
          <h3 className="font-bold text-lg">{model.model_name}</h3>
        </div>
        {model.link && (
          <a
            href={model.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-blue-500 hover:text-blue-700 transition-colors duration-200"
          >
            <FiExternalLink size={18} />
          </a>
        )}
      </div>
      <p className="text-sm text-gray-600 mb-2">
        {model.description || "Custom model—no description is available."}
      </p>
      <div className="text-xs text-gray-500">
        {model.isDefault ? "Default" : "Self-hosted"}
      </div>
      {onSelect && (
        <div className="mt-3">
          <button
            className={`w-full p-2 rounded-lg text-sm ${
              selected
                ? "bg-background-125 border border-border cursor-not-allowed"
                : "bg-background border border-border hover:bg-hover cursor-pointer"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              if (!selected) onSelect(model);
            }}
            disabled={selected}
          >
            {selected ? "Selected Model" : "Select Model"}
          </button>
        </div>
      )}
    </div>
  );
}

export function ModelSelector({
  modelOptions,
  setSelectedModel,
  currentEmbeddingModel,
}: {
  currentEmbeddingModel: HostedEmbeddingModel;
  modelOptions: HostedEmbeddingModel[];
  setSelectedModel: (model: HostedEmbeddingModel) => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-4">
        {modelOptions.map((modelOption) => (
          <ModelOption
            key={modelOption.model_name}
            model={modelOption}
            onSelect={setSelectedModel}
            selected={currentEmbeddingModel == modelOption}
          />
        ))}
      </div>
    </div>
  );
}
