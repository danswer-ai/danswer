"use client";
import { HealthCheckBanner } from "@/components/health/healthcheck";

import { EmbeddingModelSelection } from "../EmbeddingModelSelectionForm";
import { useEffect, useState } from "react";
import { Text } from "@tremor/react";
import { ArrowLeft, ArrowRight, WarningCircle } from "@phosphor-icons/react";
import {
  CloudEmbeddingModel,
  EmbeddingProvider,
  HostedEmbeddingModel,
} from "@/components/embedding/interfaces";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { ErrorCallout } from "@/components/ErrorCallout";
import useSWR, { mutate } from "swr";
import { ThreeDotsLoader } from "@/components/Loading";
import AdvancedEmbeddingFormPage from "./AdvancedEmbeddingFormPage";
import {
  AdvancedSearchConfiguration,
  RerankingDetails,
  SavedSearchSettings,
} from "../interfaces";
import RerankingDetailsForm from "../RerankingFormPage";
import { useEmbeddingFormContext } from "@/context/EmbeddingContext";
import { Modal } from "@/components/Modal";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CustomTooltip } from "@/components/CustomTooltip";
import { CustomModal } from "@/components/CustomModal";

export default function EmbeddingForm() {
  const { toast } = useToast();
  const { formStep, nextFormStep, prevFormStep } = useEmbeddingFormContext();

  const [advancedEmbeddingDetails, setAdvancedEmbeddingDetails] =
    useState<AdvancedSearchConfiguration>({
      model_name: "",
      model_dim: 0,
      normalize: false,
      query_prefix: "",
      passage_prefix: "",
      index_name: "",
      multipass_indexing: true,
      multilingual_expansion: [],
      disable_rerank_for_streaming: false,
      api_url: null,
      num_rerank: 0,
    });

  const [rerankingDetails, setRerankingDetails] = useState<RerankingDetails>({
    rerank_api_key: "",
    rerank_provider_type: null,
    rerank_model_name: "",
    rerank_api_url: null,
  });

  const updateAdvancedEmbeddingDetails = (
    key: keyof AdvancedSearchConfiguration,
    value: any
  ) => {
    setAdvancedEmbeddingDetails((values) => ({ ...values, [key]: value }));
  };

  async function updateSearchSettings(searchSettings: SavedSearchSettings) {
    const response = await fetch(
      "/api/search-settings/update-inference-settings",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...searchSettings,
        }),
      }
    );
    return response;
  }

  const updateSelectedProvider = (
    model: CloudEmbeddingModel | HostedEmbeddingModel
  ) => {
    setSelectedProvider(model);
  };
  const [displayPoorModelName, setDisplayPoorModelName] = useState(true);
  const [showPoorModel, setShowPoorModel] = useState(false);
  const [modelTab, setModelTab] = useState<"open" | "cloud" | null>(null);

  const {
    data: currentEmbeddingModel,
    isLoading: isLoadingCurrentModel,
    error: currentEmbeddingModelError,
  } = useSWR<CloudEmbeddingModel | HostedEmbeddingModel | null>(
    "/api/search-settings/get-current-search-settings",
    errorHandlingFetcher,
    { refreshInterval: 5000 } // 5 seconds
  );

  const [selectedProvider, setSelectedProvider] = useState<
    CloudEmbeddingModel | HostedEmbeddingModel | null
  >(currentEmbeddingModel!);

  const { data: searchSettings, isLoading: isLoadingSearchSettings } =
    useSWR<SavedSearchSettings | null>(
      "/api/search-settings/get-current-search-settings",
      errorHandlingFetcher,
      { refreshInterval: 5000 } // 5 seconds
    );

  useEffect(() => {
    if (searchSettings) {
      setAdvancedEmbeddingDetails({
        model_name: searchSettings.model_name,
        model_dim: searchSettings.model_dim,
        normalize: searchSettings.normalize,
        query_prefix: searchSettings.query_prefix,
        passage_prefix: searchSettings.passage_prefix,
        index_name: searchSettings.index_name,
        multipass_indexing: searchSettings.multipass_indexing,
        multilingual_expansion: searchSettings.multilingual_expansion,
        disable_rerank_for_streaming:
          searchSettings.disable_rerank_for_streaming,
        num_rerank: searchSettings.num_rerank,
        api_url: null,
      });

      setRerankingDetails({
        rerank_api_key: searchSettings.rerank_api_key,
        rerank_provider_type: searchSettings.rerank_provider_type,
        rerank_model_name: searchSettings.rerank_model_name,
        rerank_api_url: searchSettings.rerank_api_url,
      });
    }
  }, [searchSettings]);

  const originalRerankingDetails: RerankingDetails = searchSettings
    ? {
        rerank_api_key: searchSettings.rerank_api_key,
        rerank_provider_type: searchSettings.rerank_provider_type,
        rerank_model_name: searchSettings.rerank_model_name,
        rerank_api_url: searchSettings.rerank_api_url,
      }
    : {
        rerank_api_key: "",
        rerank_provider_type: null,
        rerank_model_name: "",
        rerank_api_url: null,
      };

  useEffect(() => {
    if (currentEmbeddingModel) {
      setSelectedProvider(currentEmbeddingModel);
    }
  }, [currentEmbeddingModel]);

  useEffect(() => {
    if (currentEmbeddingModel) {
      setSelectedProvider(currentEmbeddingModel);
    }
  }, [currentEmbeddingModel]);
  if (!selectedProvider) {
    return <ThreeDotsLoader />;
  }
  if (currentEmbeddingModelError || !currentEmbeddingModel) {
    return <ErrorCallout errorTitle="Failed to fetch embedding model status" />;
  }

  const updateCurrentModel = (newModel: string) => {
    setAdvancedEmbeddingDetails((values) => ({
      ...values,
      model_name: newModel,
    }));
  };

  const updateSearch = async () => {
    let values: SavedSearchSettings = {
      ...rerankingDetails,
      ...advancedEmbeddingDetails,
      provider_type:
        selectedProvider.provider_type?.toLowerCase() as EmbeddingProvider | null,
    };

    const response = await updateSearchSettings(values);
    if (response.ok) {
      toast({
        title: "Success",
        description: "Updated search settings successfully",
        variant: "success",
      });
      mutate("/api/search-settings/get-current-search-settings");
      return true;
    } else {
      toast({
        title: "Error",
        description: "Failed to update search settings",
        variant: "destructive",
      });
      return false;
    }
  };

  const onConfirm = async () => {
    if (!selectedProvider) {
      return;
    }
    let newModel: SavedSearchSettings;

    // We use a spread operation to merge properties from multiple objects into a single object.
    // Advanced embedding details may update default values.
    if (selectedProvider.provider_type != null) {
      // This is a cloud model
      newModel = {
        ...rerankingDetails,
        ...advancedEmbeddingDetails,
        ...selectedProvider,
        provider_type:
          (selectedProvider.provider_type
            ?.toLowerCase()
            .split(" ")[0] as EmbeddingProvider) || null,
      };
    } else {
      // This is a locally hosted model
      newModel = {
        ...selectedProvider,
        ...rerankingDetails,
        ...advancedEmbeddingDetails,
        ...selectedProvider,
        provider_type: null,
      };
    }
    newModel.index_name = null;

    const response = await fetch(
      "/api/search-settings/set-new-search-settings",
      {
        method: "POST",
        body: JSON.stringify(newModel),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.ok) {
      toast({
        title: "Provider Change Successful",
        description:
          "You have successfully changed the provider. Redirecting to the embedding page...",
        variant: "success",
      });
      mutate("/api/search-settings/get-secondary-search-settings");
      setTimeout(() => {
        window.open("/admin/configuration/search", "_self");
      }, 2000);
    } else {
      const errorMsg = await response.text();
      toast({
        title: "Update Failed",
        description: `Could not update the embedding model: ${errorMsg}`,
        variant: "destructive",
      });
    }
  };

  const needsReIndex =
    currentEmbeddingModel != selectedProvider ||
    searchSettings?.multipass_indexing !=
      advancedEmbeddingDetails.multipass_indexing;

  const ReIndexingButton = ({ needsReIndex }: { needsReIndex: boolean }) => {
    return needsReIndex ? (
      <div className="flex mx-auto gap-x-1 ml-auto items-center">
        <Button
          onClick={async () => {
            const update = await updateSearch();
            if (update) {
              await onConfirm();
            }
          }}
          className="w-full md:w-auto"
        >
          Re-index
        </Button>

        <CustomTooltip
          trigger={
            <WarningCircle
              className="text-text-800 cursor-help"
              size={20}
              weight="fill"
            />
          }
        >
          <ul className="list-disc pl-5">
            {currentEmbeddingModel != selectedProvider && (
              <li>Changed embedding provider</li>
            )}
            {searchSettings?.multipass_indexing !=
              advancedEmbeddingDetails.multipass_indexing && (
              <li>Multipass indexing modification</li>
            )}
          </ul>
        </CustomTooltip>
      </div>
    ) : (
      <div className="flex items-center justify-center">
        <Button
          onClick={async () => {
            updateSearch();
          }}
          className="w-full md:w-auto"
        >
          Update Search
        </Button>
      </div>
    );
  };

  return (
    <div className="mx-auto mb-8 w-full">
      <div className="mb-4">
        <HealthCheckBanner />
      </div>
      <div className="">
        {formStep == 0 && (
          <>
            <h2 className="text-2xl font-bold mb-4 text-text-800">
              Select an Embedding Model
            </h2>
            <Text className="mb-4">
              Note that updating the backing model will require a complete
              re-indexing of all documents across every connected source. This
              is taken care of in the background so that the system can continue
              to be used, but depending on the size of the corpus, this could
              take hours or days. You can monitor the progress of the
              re-indexing on this page while the models are being switched.
            </Text>
            <Card className="overflow-x-auto">
              <CardContent>
                <EmbeddingModelSelection
                  updateCurrentModel={updateCurrentModel}
                  setModelTab={setModelTab}
                  modelTab={modelTab}
                  selectedProvider={selectedProvider}
                  currentEmbeddingModel={currentEmbeddingModel}
                  updateSelectedProvider={updateSelectedProvider}
                  advancedEmbeddingDetails={advancedEmbeddingDetails}
                />
              </CardContent>
            </Card>
            <div className="mt-4 flex w-full justify-end">
              <Button
                onClick={() => {
                  if (
                    selectedProvider.model_name.includes("e5") &&
                    displayPoorModelName
                  ) {
                    setDisplayPoorModelName(false);
                    setShowPoorModel(true);
                  } else {
                    nextFormStep();
                  }
                }}
                variant="outline"
              >
                Continue
                <ArrowRight />
              </Button>
            </div>
          </>
        )}
        {showPoorModel && (
          <CustomModal
            onClose={() => setShowPoorModel(false)}
            title={`Are you sure you want to select ${selectedProvider.model_name}?`}
            trigger={null}
            open={showPoorModel}
          >
            <>
              <div className="text-lg">
                {selectedProvider.model_name} is a lower accuracy model.
                <br />
                We recommend the following alternatives.
                <li>Cohere embed-english-v3.0 for cloud-based</li>
                <li>Nomic nomic-embed-text-v1 for self-hosted</li>
              </div>
              <div className="flex mt-4 justify-between">
                <Button
                  variant="destructive"
                  onClick={() => setShowPoorModel(false)}
                >
                  Cancel update
                </Button>
                <Button
                  onClick={() => {
                    setShowPoorModel(false);
                    nextFormStep();
                  }}
                >
                  Continue with {selectedProvider.model_name}
                </Button>
              </div>
            </>
          </CustomModal>
        )}

        {formStep == 1 && (
          <>
            <Card className="overflow-x-auto">
              <CardContent>
                <RerankingDetailsForm
                  setModelTab={setModelTab}
                  modelTab={
                    originalRerankingDetails.rerank_model_name
                      ? modelTab
                      : modelTab || "cloud"
                  }
                  currentRerankingDetails={rerankingDetails}
                  originalRerankingDetails={originalRerankingDetails}
                  setRerankingDetails={setRerankingDetails}
                />
              </CardContent>
            </Card>

            <div
              className={` mt-5 w-full flex justify-between gap-4 items-start flex-col md:flex-row`}
            >
              <div className="w-full flex">
                <Button
                  onClick={() => prevFormStep()}
                  variant="outline"
                  className="w-full md:w-auto"
                >
                  <ArrowLeft />
                  Previous
                </Button>
              </div>

              <ReIndexingButton needsReIndex={needsReIndex} />

              <div className="flex w-full justify-end">
                <Button
                  variant="outline"
                  // disabled={!isFormValid}
                  onClick={() => {
                    nextFormStep();
                  }}
                  className="w-full md:w-auto"
                >
                  Advanced
                  <ArrowRight />
                </Button>
              </div>
            </div>
          </>
        )}
        {formStep == 2 && (
          <>
            <Card>
              <CardContent>
                <AdvancedEmbeddingFormPage
                  advancedEmbeddingDetails={advancedEmbeddingDetails}
                  updateAdvancedEmbeddingDetails={
                    updateAdvancedEmbeddingDetails
                  }
                />
              </CardContent>
            </Card>

            <div className={`mt-4 w-full grid md:grid-cols-3 gap-4 items-star`}>
              <div>
                <Button
                  onClick={() => prevFormStep()}
                  variant="outline"
                  className="w-full md:w-auto"
                >
                  <ArrowLeft />
                  Previous
                </Button>
              </div>

              <ReIndexingButton needsReIndex={needsReIndex} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
