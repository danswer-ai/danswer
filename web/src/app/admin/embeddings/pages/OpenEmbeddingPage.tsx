"use client";
import { Text } from "@tremor/react";
import { ModelSelector } from "../../../../components/embedding/ModelSelector";
import {
  AVAILABLE_MODELS,
  CloudEmbeddingModel,
  HostedEmbeddingModel,
} from "../../../../components/embedding/interfaces";
import { CustomModelForm } from "../../../../components/embedding/CustomModelForm";
import { useState } from "react";
import { Title } from "@tremor/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
export default function OpenEmbeddingPage({
  onSelectOpenSource,
  selectedProvider,
}: {
  onSelectOpenSource: (model: HostedEmbeddingModel) => Promise<void>;
  selectedProvider: HostedEmbeddingModel | CloudEmbeddingModel;
}) {
  const [configureModel, setConfigureModel] = useState(false);
  return (
    <div>
      <Title className="mt-8">
        Here are some locally-hosted models to choose from.
      </Title>
      <Text className="mb-4">
        These models can be used without any API keys, and can leverage a GPU
        for faster inference.
      </Text>
      <ModelSelector
        modelOptions={AVAILABLE_MODELS}
        setSelectedModel={onSelectOpenSource}
        currentEmbeddingModel={selectedProvider}
      />

      <Text className="mt-6">
        Alternatively, (if you know what you&apos;re doing) you can specify a{" "}
        <a
          rel="noopener"
          target="_blank"
          href="https://www.sbert.net/"
          className="text-link"
        >
          SentenceTransformers
        </a>
        -compatible model of your choice below. The rough list of supported
        models can be found{" "}
        <a
          rel="noopener"
          target="_blank"
          href="https://huggingface.co/models?library=sentence-transformers&sort=trending"
          className="text-link"
        >
          here
        </a>
        .
        <br />
        <b>NOTE:</b> not all models listed will work with enMedD AI, since some
        have unique interfaces or special requirements. If in doubt, reach out
        to the enMedD AI team.
      </Text>
      {!configureModel && (
        <Button onClick={() => setConfigureModel(true)} className="mt-4">
          Configure custom model
        </Button>
      )}
      {configureModel && (
        <div className="w-full flex">
          <Card className="mt-4 2xl:w-4/6 mx-auto">
            <CardContent>
              <CustomModelForm onSubmit={onSelectOpenSource} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
