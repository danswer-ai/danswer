import {
  EmbeddingModelDescriptor,
  FullEmbeddingModelDescriptor,
} from "./embeddingModels";
import { FiStar } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ModelOption({
  model,
  onSelect,
}: {
  model: FullEmbeddingModelDescriptor;
  onSelect?: (model: EmbeddingModelDescriptor) => void;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-0">
        <CardTitle className="flex">
          {model.isDefault && <FiStar className="my-auto mr-1 text-accent" />}
          {model.model_name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div>
          <div className="mx-1 mt-1 text-sm">
            {model.description
              ? model.description
              : "Custom model—no description is available."}
          </div>
          {model.link && (
            <a
              target="_blank"
              href={model.link}
              className="mx-1 mt-1 text-xs text-link"
            >
              See More Details
            </a>
          )}
        </div>
      </CardContent>

      {onSelect && (
        <CardFooter className="mt-auto">
          <Button onClick={() => onSelect(model)}>Select Model</Button>
        </CardFooter>
      )}
    </Card>
  );
}

export function ModelSelector({
  modelOptions,
  setSelectedModel,
}: {
  modelOptions: FullEmbeddingModelDescriptor[];
  setSelectedModel: (model: EmbeddingModelDescriptor) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-4">
        {modelOptions.map((modelOption) => (
          <ModelOption
            key={modelOption.model_name}
            model={modelOption}
            onSelect={setSelectedModel}
          />
        ))}
      </div>
    </div>
  );
}
