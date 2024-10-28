"use client";

import { Text, Title } from "@tremor/react";

import {
  CloudEmbeddingProvider,
  CloudEmbeddingModel,
  AVAILABLE_CLOUD_PROVIDERS,
  CloudEmbeddingProviderFull,
  EmbeddingModelDescriptor,
  EmbeddingProvider,
  LITELLM_CLOUD_PROVIDER,
  AZURE_CLOUD_PROVIDER,
} from "../../../../components/embedding/interfaces";
import { EmbeddingDetails } from "../EmbeddingModelSelectionForm";
import { FiExternalLink, FiInfo, FiTrash } from "react-icons/fi";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { CustomEmbeddingModelForm } from "@/components/embedding/CustomEmbeddingModelForm";
import { deleteSearchSettings } from "./utils";
import { DeleteEntityModal } from "@/components/modals/DeleteEntityModal";
import { AdvancedSearchConfiguration } from "../interfaces";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {Card, CardContent } from "@/components/ui/card";
import { CustomTooltip } from "@/components/CustomTooltip";

export default function CloudEmbeddingPage({
  currentModel,
  embeddingProviderDetails,
  embeddingModelDetails,
  setShowTentativeProvider,
  setChangeCredentialsProvider,
  setAlreadySelectedModel,
  setShowTentativeModel,
  setShowModelInQueue,
  advancedEmbeddingDetails,
}: {
  setShowModelInQueue: Dispatch<SetStateAction<CloudEmbeddingModel | null>>;
  setShowTentativeModel: Dispatch<SetStateAction<CloudEmbeddingModel | null>>;
  currentModel: EmbeddingModelDescriptor | CloudEmbeddingModel;
  setAlreadySelectedModel: Dispatch<SetStateAction<CloudEmbeddingModel | null>>;
  embeddingModelDetails?: CloudEmbeddingModel[];
  embeddingProviderDetails?: EmbeddingDetails[];
  setShowTentativeProvider: React.Dispatch<
    React.SetStateAction<CloudEmbeddingProvider | null>
  >;
  setChangeCredentialsProvider: React.Dispatch<
    React.SetStateAction<CloudEmbeddingProvider | null>
  >;
  advancedEmbeddingDetails: AdvancedSearchConfiguration;
}) {
  function hasProviderTypeinArray(
    arr: Array<{ provider_type: string }>,
    searchName: string
  ): boolean {
    return arr.some(
      (item) => item.provider_type.toLowerCase() === searchName.toLowerCase()
    );
  }

  let providers: CloudEmbeddingProviderFull[] = AVAILABLE_CLOUD_PROVIDERS.map(
    (model) => ({
      ...model,
      configured:
        embeddingProviderDetails &&
        hasProviderTypeinArray(embeddingProviderDetails, model.provider_type),
    })
  );
  const [liteLLMProvider, setLiteLLMProvider] = useState<
    EmbeddingDetails | undefined
  >(undefined);

  const [azureProvider, setAzureProvider] = useState<
    EmbeddingDetails | undefined
  >(undefined);

  useEffect(() => {
    const liteLLMProvider = embeddingProviderDetails?.find(
      (provider) =>
        provider.provider_type === EmbeddingProvider.LITELLM.toLowerCase()
    );
    setLiteLLMProvider(liteLLMProvider);
    const azureProvider = embeddingProviderDetails?.find(
      (provider) =>
        provider.provider_type === EmbeddingProvider.AZURE.toLowerCase()
    );
    setAzureProvider(azureProvider);
  }, [embeddingProviderDetails]);

  const isAzureConfigured = azureProvider !== undefined;

  // Get details of the configured Azure provider
  const azureProviderDetails = embeddingProviderDetails?.find(
    (provider) => provider.provider_type.toLowerCase() === "azure"
  );

  return (
    <div>
      <Title className="mt-8">
        Here are some cloud-based models to choose from.
      </Title>
      <Text className="mb-4">
        These models require API keys and run in the clouds of the respective
        providers.
      </Text>

      <div className="gap-4 mt-2 pb-10 flex content-start flex-wrap">
        {providers.map((provider) => (
          <div key={provider.provider_type} className="mt-4 w-full">
            <div className="flex items-center mb-2">
              {provider.icon({ size: 40 })}
              <h2 className="ml-2  mt-2 text-xl font-bold">
                {provider.provider_type}{" "}
                {provider.provider_type == "Cohere" && "(recommended)"}
              </h2>
              <CustomTooltip trigger={<FiInfo className="ml-2 mt-2 cursor-pointer" size={18} />}>
                {provider.description}
              </CustomTooltip>
            </div>

            <button
              onClick={() => {
                if (!provider.configured) {
                  setShowTentativeProvider(provider);
                } else {
                  setChangeCredentialsProvider(provider);
                }
              }}
              className="mb-2  hover:underline text-sm cursor-pointer"
            >
              {provider.configured ? "Modify API key" : "Provide API key"}
            </button>
            <div className="flex flex-wrap gap-4">
              {provider.embedding_models.map((model) => (
                <CloudModelCard
                  key={model.model_name}
                  model={model}
                  provider={provider}
                  currentModel={currentModel}
                  setAlreadySelectedModel={setAlreadySelectedModel}
                  setShowTentativeModel={setShowTentativeModel}
                  setShowModelInQueue={setShowModelInQueue}
                  setShowTentativeProvider={setShowTentativeProvider}
                />
              ))}
            </div>
          </div>
        ))}

        <Text className="mt-6">
          Alternatively, you can use a self-hosted model using the LiteLLM
          proxy. This allows you to leverage various LLM providers through a
          unified interface that you control.{" "}
          <a
            href="https://docs.litellm.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            Learn more about LiteLLM
          </a>
        </Text>

        <div key={LITELLM_CLOUD_PROVIDER.provider_type} className="mt-4 w-full">
          <div className="flex items-center mb-2">
            {LITELLM_CLOUD_PROVIDER.icon({ size: 40 })}
            <h2 className="ml-2  mt-2 text-xl font-bold">
              {LITELLM_CLOUD_PROVIDER.provider_type}{" "}
              {LITELLM_CLOUD_PROVIDER.provider_type == "Cohere" &&
                "(recommended)"}
            </h2>

<CustomTooltip trigger={<FiInfo className="ml-2 mt-2 cursor-pointer" size={18} />}>
{LITELLM_CLOUD_PROVIDER.description}
              </CustomTooltip>

          </div>
          <div className="w-full flex flex-col items-start pt-4">
            {!liteLLMProvider ? (
              <Button
                onClick={() => setShowTentativeProvider(LITELLM_CLOUD_PROVIDER)}
              >
                Set API Configuration
              </Button>
            ) : (
              <Button
                onClick={() =>
                  setChangeCredentialsProvider(LITELLM_CLOUD_PROVIDER)
                }
              >
                Modify API Configuration
              </Button>
            )}

            {!liteLLMProvider && (
         <Card className="mt-4 w-full sm:w-96">
                <CardContent>
                  <Text className="text-lg font-semibold mb-2">
                    API URL Required
                  </Text>
                  <Text className="text-sm text-gray-600 mb-4">
                    Before you can add models, you need to provide an API URL
                    for your LiteLLM proxy. Click the &quot;Provide API
                    URL&quot; button above to set up your LiteLLM configuration.
                  </Text>
                  <div className="flex items-center">
                    <FiInfo className="text-blue-500 mr-2 shrink-0" size={18} />
                    <Text className="text-sm text-blue-500">
                      Once configured, you&apos;ll be able to add and manage
                      your LiteLLM models here.
                    </Text>
                </div>
                </CardContent>
              </Card>
            )}
            {liteLLMProvider && (
              <>
                <div className="flex mb-4 flex-wrap gap-4">
                  {embeddingModelDetails
                    ?.filter(
                      (model) =>
                        model.provider_type ===
                        EmbeddingProvider.LITELLM.toLowerCase()
                    )
                    .map((model) => (
                      <CloudModelCard
                        key={model.model_name}
                        model={model}
                        provider={LITELLM_CLOUD_PROVIDER}
                        currentModel={currentModel}
                        setAlreadySelectedModel={setAlreadySelectedModel}
                        setShowTentativeModel={setShowTentativeModel}
                        setShowModelInQueue={setShowModelInQueue}
                        setShowTentativeProvider={setShowTentativeProvider}
                      />
                    ))}
                </div>

                <Card
                  className={`mt-2 w-full max-w-4xl ${
                    currentModel.provider_type === EmbeddingProvider.LITELLM
                      ? "border-2 border-blue-500"
                      : ""
                  }`}
                >
                  <CardContent>
                  <CustomEmbeddingModelForm
                    embeddingType={EmbeddingProvider.LITELLM}
                    provider={liteLLMProvider}
                    currentValues={
                      currentModel.provider_type === EmbeddingProvider.LITELLM
                        ? (currentModel as CloudEmbeddingModel)
                        : null
                    }
                    setShowTentativeModel={setShowTentativeModel}
                  />
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
        <Text className="mt-6">
          You can also use Azure OpenAI models for embeddings. Azure requires
          separate configuration for each model.
        </Text>

        <div key={AZURE_CLOUD_PROVIDER.provider_type} className="mt-4 w-full">
          <div className="flex items-center mb-2">
            {AZURE_CLOUD_PROVIDER.icon({ size: 40 })}
            <h2 className="ml-2  mt-2 text-xl font-bold">
              {AZURE_CLOUD_PROVIDER.provider_type}{" "}
            </h2>

<CustomTooltip trigger={<FiInfo className="ml-2 mt-2 cursor-pointer" size={18} />}>
{AZURE_CLOUD_PROVIDER.description}
              </CustomTooltip>

          </div>
        </div>

        <div className="w-full flex flex-col items-start">
          {!isAzureConfigured ? (
            <>
              <Button
                onClick={() => setShowTentativeProvider(AZURE_CLOUD_PROVIDER)}
              >
                Configure Azure OpenAI
              </Button>
              <Card className="mt-4 w-full sm:w-96">
              <CardContent>
                <Text className="text-base font-medium mb-2">
                    Configure Azure OpenAI for Embeddings
                  </Text>
                  <Text className="text-sm text-gray-600 mb-3">
                    Click &quot;Configure Azure OpenAI&quot; to set up Azure
                    OpenAI for embeddings.
                  </Text>
                  <div className="flex items-center text-sm text-gray-700">
                    <FiInfo className="text-gray-400 mr-2 shrink-0" size={16} />
                    <Text>
                      You&apos;ll need: API version, base URL, API key, model
                      name, and deployment name.
                    </Text>
                  </div></CardContent>
                </Card>
            </>
          ) : (
            <>
              <div className="mb-6 w-full">
                <Text className="text-lg font-semibold mb-3">
                  Current Azure Configuration
                </Text>

                {azureProviderDetails ? (
                  <Card >
                    <CardContent>
                      <div className="p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="font-medium">API Version:</span>
                        <span>{azureProviderDetails.api_version}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Base URL:</span>
                        <span>{azureProviderDetails.api_url}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Deployment Name:</span>
                        <span>{azureProviderDetails.deployment_name}</span>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setChangeCredentialsProvider(AZURE_CLOUD_PROVIDER)
                      }
                      className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                    >
                      Delete Current Azure Provider
                    </button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="p-4 text-gray-500 text-center">
                      No Azure provider has been configured yet.
                    </div>
                  </Card>
                )}
              </div>

              <Card
                className={`mt-2 w-full max-w-4xl ${
                  currentModel.provider_type === EmbeddingProvider.AZURE
                    ? "border-2 border-blue-500"
                    : ""
                }`}
              >
                {azureProvider && (
                  <CustomEmbeddingModelForm
                    embeddingType={EmbeddingProvider.AZURE}
                    provider={azureProvider}
                    currentValues={
                      currentModel.provider_type === EmbeddingProvider.AZURE
                        ? (currentModel as CloudEmbeddingModel)
                        : null
                    }
                    setShowTentativeModel={setShowTentativeModel}
                  />
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function CloudModelCard({
  model,
  provider,
  currentModel,
  setAlreadySelectedModel,
  setShowTentativeModel,
  setShowModelInQueue,
  setShowTentativeProvider,
}: {
  model: CloudEmbeddingModel;
  provider: CloudEmbeddingProviderFull;
  currentModel: EmbeddingModelDescriptor | CloudEmbeddingModel;
  setAlreadySelectedModel: Dispatch<SetStateAction<CloudEmbeddingModel | null>>;
  setShowTentativeModel: Dispatch<SetStateAction<CloudEmbeddingModel | null>>;
  setShowModelInQueue: Dispatch<SetStateAction<CloudEmbeddingModel | null>>;
  setShowTentativeProvider: React.Dispatch<
    React.SetStateAction<CloudEmbeddingProvider | null>
  >;
}) {
  const { toast } = useToast();
  const [showDeleteModel, setShowDeleteModel] = useState(false);
  const enabled =
    model.model_name === currentModel.model_name &&
    model.provider_type?.toLowerCase() ==
      currentModel.provider_type?.toLowerCase();

      const deleteModel = async () => {
        if (!model.id) {
          toast({
            title: "Deletion Error",
            description: "Model cannot be deleted",
            variant: "destructive",
          });
          return;
        }
      
        const response = await deleteSearchSettings(model.id);
      
        if (response.ok) {
          toast({
            title: "Success",
            description: "Model deleted successfully",
            variant: "success",
          });
          setShowDeleteModel(false);
        } else {
          toast({
            title: "Deletion Failed",
            description: "Failed to delete model. Ensure you are not attempting to delete a currently active model.",
            variant: "destructive",
          });
        }
      };

  return (
    <div
      className={`p-4 md:w-96 border rounded-lg transition-all duration-200 flex flex-col justify-between ${
        enabled
          ? "border-blue-500 bg-blue-50 shadow-md"
          : "border-gray-300 hover:border-blue-300 hover:shadow-sm"
      } ${!provider.configured && "opacity-80 hover:opacity-100"}`}
    >
      <div>
      {showDeleteModel && (
        <DeleteEntityModal
          entityName={model.model_name}
          entityType="embedding model configuration"
          onSubmit={() => deleteModel()}
          onClose={() => setShowDeleteModel(false)}
          showDeleteModel={showDeleteModel}
        />
      )}

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg">{model.model_name}</h3>
        <div className="flex gap-x-2">
          {model.provider_type == EmbeddingProvider.LITELLM.toLowerCase() && (
            <Button
            variant='destructive'
              onClickCapture={() => setShowDeleteModel(true)}
              onClick={(e) => e.stopPropagation()}
            >
              <FiTrash size={18} />
            </Button>
          )}
          <a
            href={provider.website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-blue-500 hover:text-blue-700 transition-colors duration-200"
          >
            <FiExternalLink size={18} />
          </a>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-2">{model.description}</p>
      {model?.provider_type?.toLowerCase() !=
        EmbeddingProvider.LITELLM.toLowerCase() && (
        <div className="text-xs text-gray-500 mb-2">
          ${model.pricePerMillion}/M tokens
        </div>
      )}
      </div>
      <div className="mt-auto">
        <Button
          className="w-full"
          variant='outline'
          onClick={() => {
            if (enabled) {
              setAlreadySelectedModel(model);
            } else if (
              provider.configured ||
              provider.provider_type === EmbeddingProvider.LITELLM
            ) {
              setShowTentativeModel(model);
            } else {
              setShowModelInQueue(model);
              setShowTentativeProvider(provider);
            }
          }}
          disabled={enabled}
        >
          {enabled ? "Selected Model" : "Select Model"}
        </Button>
      </div>
    </div>
  );
}
