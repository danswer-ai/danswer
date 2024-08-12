"use client";
import { Button, Card, Text } from "@tremor/react";
import { ModelSelector } from "../../../../components/embedding/ModelSelector";
import {
  AVAILABLE_MODELS,
  CloudEmbeddingModel,
  HostedEmbeddingModel,
} from "../../../../components/embedding/interfaces";
import { CustomModelForm } from "../../../../components/embedding/CustomModelForm";
import { useState } from "react";

export default function OpenEmbeddingPage({
  onSelectOpenSource,
  currentEmbeddingModel,
}: {
  onSelectOpenSource: (model: HostedEmbeddingModel) => Promise<void>;
  currentEmbeddingModel: HostedEmbeddingModel | CloudEmbeddingModel;
}) {
  const [configureModel, setConfigureModel] = useState(false);
  return (
    <div>
      <ModelSelector
        modelOptions={AVAILABLE_MODELS}
        setSelectedModel={onSelectOpenSource}
        currentEmbeddingModel={currentEmbeddingModel}
      />

      <Text className="mt-6">
        Alternatively, (if you know what you&apos;re doing) you can specify a{" "}
        <a target="_blank" href="https://www.sbert.net/" className="text-link">
          SentenceTransformers
        </a>
        -compatible model of your choice below. The rough list of supported
        models can be found{" "}
        <a
          target="_blank"
          href="https://huggingface.co/models?library=sentence-transformers&sort=trending"
          className="text-link"
        >
          here
        </a>
        .
        <br />
        <b>NOTE:</b> not all models listed will work with Danswer, since some
        have unique interfaces or special requirements. If in doubt, reach out
        to the Danswer team.
      </Text>
      {!configureModel && (
        <Button onClick={() => setConfigureModel(true)} className="mt-4">
          Configure custom model
        </Button>
      )}
      {configureModel && (
        <div className="w-full flex">
          <Card className="mt-4 2xl:w-4/6 mx-auto">
            <CustomModelForm onSubmit={onSelectOpenSource} />
          </Card>
        </div>
      )}
    </div>
  );
}
