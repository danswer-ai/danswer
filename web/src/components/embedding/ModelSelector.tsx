import { getCurrentModelCopy } from "@/app/admin/embeddings/interfaces";
import {
  EmbeddingModelDescriptor,
  getIconForRerankType,
  getTitleForRerankType,
  HostedEmbeddingModel,
} from "./interfaces";
import { FiExternalLink } from "react-icons/fi";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";

export function ModelPreview({
  model,
  display,
}: {
  model: EmbeddingModelDescriptor;
  display?: boolean;
}) {
  const currentModelCopy = getCurrentModelCopy(model.model_name);

  return (
    <Card className="!mr-auto mt-3 !w-96">
      <CardHeader className="pb-0">
        <CardTitle>{model.model_name}</CardTitle>
      </CardHeader>
      <CardContent>
        {model.description ||
          currentModelCopy?.description ||
          "Custom model—no description is available."}
      </CardContent>
    </Card>
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
  const currentModelCopy = getCurrentModelCopy(model.model_name);

  return (
    <div
      className={`p-4 md:w-96 border rounded-lg transition-all duration-200 flex flex-col justify-between ${
        selected
          ? "border-blue-500 bg-blue-50 shadow-md"
          : "border-gray-200 hover:border-blue-300 hover:shadow-sm"
      }`}
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">{model.model_name}</h3>

          {model.link && (
            <a
              href={model.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-blue-500 transition-colors duration-200 hover:text-blue-700"
            >
              <FiExternalLink size={18} />
            </a>
          )}
        </div>
        <p className="mb-2 text-sm text-left text-gray-600 k">
          {model.description ||
            currentModelCopy?.description ||
            "Custom model—no description is available."}
        </p>
        <div className="text-xs text-gray-500">
          {model.isDefault ? "Default" : "Self-hosted"}
        </div>
      </div>
      {onSelect && (
        <div className="mt-3">
          <Button
            className={`w-full`}
            onClick={(e) => {
              e.stopPropagation();
              if (!selected) onSelect(model);
            }}
            disabled={selected}
            variant="outline"
          >
            {selected ? "Selected Model" : "Select Model"}
          </Button>
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
  const groupedModelOptions = modelOptions.reduce(
    (acc, model) => {
      const [type] = model.model_name.split("/");
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(model);
      return acc;
    },
    {} as Record<string, HostedEmbeddingModel[]>
  );

  return (
    <div>
      <div className="flex flex-col gap-6 gap-y-6">
        {Object.entries(groupedModelOptions).map(([type, models]) => (
          <div key={type}>
            <div className="flex items-center mb-2">
              {getIconForRerankType(type)}
              <h2 className="mt-2 ml-2 text-xl font-bold">
                {getTitleForRerankType(type)}
              </h2>
            </div>

            <div className="flex flex-wrap gap-4 mt-4">
              {models.map((modelOption) => (
                <ModelOption
                  key={modelOption.model_name}
                  model={modelOption}
                  onSelect={setSelectedModel}
                  selected={currentEmbeddingModel === modelOption}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
