/* import { DefaultDropdown, StringOrNumberOption } from "@/components/Dropdown";
import { Title, Text, Divider, Card } from "@tremor/react";
import {
  EmbeddingModelDescriptor,
  FullEmbeddingModelDescriptor,
} from "./embeddingModels";
import { FiStar } from "react-icons/fi";
import { CustomModelForm } from "./CustomModelForm";
import { Button } from "@/components/ui/button";

export function ModelOption({
  model,
  onSelect,
}: {
  model: FullEmbeddingModelDescriptor;
  onSelect?: (model: EmbeddingModelDescriptor) => void;
}) {
  return (
    <div
      className={
        "p-2 border border-border rounded shadow-md bg-hover-light md:w-96 flex flex-col"
      }
    >
      <div className="flex text-lg font-bold">
        {model.isDefault && <FiStar className="my-auto mr-1 text-accent" />}
        {model.model_name}
      </div>
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
      {onSelect && (
        <Button onClick={() => onSelect(model)} className="m-auto mb-1">
          Select Model
        </Button>
      )}
    </div>
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
      <div className="flex flex-wrap gap-4">
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
} */
/* import {
  EmbeddingModelDescriptor,
  FullEmbeddingModelDescriptor,
} from "./embeddingModels";
import { FiStar } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Modal } from "@/components/Modal";

export function ModelOption({
  model,
  onSelect,
}: {
  model: FullEmbeddingModelDescriptor;
  onSelect?: (model: EmbeddingModelDescriptor) => void;
}) {
  return (
    <Card className="flex flex-col justify-between">
      <CardHeader className="pb-4">
        <CardTitle className="flex">
          {model.isDefault && <FiStar className="my-auto mr-1 text-accent" />}
          {model.model_name}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
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
        <CardFooter>
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
} */
import {
  EmbeddingModelDescriptor,
  FullEmbeddingModelDescriptor,
} from "./embeddingModels";
import { FiStar } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Modal } from "@/components/Modal";

export function ModelOption({
  model,
  onSelect,
}: {
  model: FullEmbeddingModelDescriptor;
  onSelect?: (model: EmbeddingModelDescriptor) => void;
}) {
  return (
    <Card className="flex flex-col justify-between">
      <CardHeader className="pb-4">
        <CardTitle className="flex">
          {model.isDefault && <FiStar className="my-auto mr-1 text-accent" />}
          {model.model_name}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
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
        <CardFooter>
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
