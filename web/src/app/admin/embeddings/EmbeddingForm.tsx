"use client";
import { usePopup } from "@/components/admin/connectors/Popup";
import { AdminPageTitle } from "@/components/admin/Title";
import { useFormContext } from "@/components/context/EmbeddingContext";
import { HealthCheckBanner } from "@/components/health/healthcheck";

import { EmbeddingModelSelection } from "../configuration/search/EmbeddingModelSelectionForm";
import { useEffect, useState } from "react";
import { Button, Card, Text } from "@tremor/react";
import { ArrowLeft, ArrowRight, WarningCircle } from "@phosphor-icons/react";
import {
  CloudEmbeddingModel,
  EmbeddingModelDescriptor,
  HostedEmbeddingModel,
} from "../configuration/search/components/types";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { ErrorCallout } from "@/components/ErrorCallout";
import useSWR, { mutate } from "swr";
import { ThreeDotsLoader } from "@/components/Loading";
import AdvancedEmbeddingFormPage from "./AdvancedEmbeddingFormPage";
import {
  AdvancedDetails,
  RerankingDetails,
  SavedSearchSettings,
} from "./types";
import RerankingDetailsForm from "./RerankingFormPage";
import { CustomTooltip } from "@/components/tooltip/CustomTooltip";

export default function EmbeddingForm() {
  const { formStep, nextFormStep, prevFormStep } = useFormContext();
  const { popup, setPopup } = usePopup();

  const [advancedEmbeddingDetails, setAdvancedEmbeddingDetails] =
    useState<AdvancedDetails>({
      disable_rerank_for_streaming: false,
      multilingual_expansion: [],
      multipass_indexing: true,
    });

  const [rerankingDetails, setRerankingDetails] = useState<RerankingDetails>({
    api_key: "",
    num_rerank: 0,
    provider_type: null,
    rerank_model_name: "",
  });

  const updateAdvancedEmbeddingDetails = (
    key: keyof AdvancedDetails,
    value: any
  ) => {
    setAdvancedEmbeddingDetails((values) => ({ ...values, [key]: value }));
  };

  async function updateSearchSettings(searchSettings: SavedSearchSettings) {
    const response = await fetch(
      "/api/search-settings/update-search-settings",
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

  const [selectedProvider, setSelectedProvider] = useState<
    CloudEmbeddingModel | HostedEmbeddingModel | null
  >(null);
  const updateSelectedProvider = (
    model: CloudEmbeddingModel | HostedEmbeddingModel
  ) => {
    setSelectedProvider(model);
  };

  const {
    data: currentEmbeddingModel,
    isLoading: isLoadingCurrentModel,
    error: currentEmbeddingModelError,
  } = useSWR<CloudEmbeddingModel | HostedEmbeddingModel | null>(
    "/api/search-settings/get-current-embedding-model",
    errorHandlingFetcher,
    { refreshInterval: 5000 } // 5 seconds
  );

  const { data: searchSettings, isLoading: isLoadingSearchSettings } =
    useSWR<SavedSearchSettings | null>(
      "/api/search-settings/get-search-settings",
      errorHandlingFetcher,
      { refreshInterval: 5000 } // 5 seconds
    );

  useEffect(() => {
    if (searchSettings) {
      setAdvancedEmbeddingDetails({
        disable_rerank_for_streaming:
          searchSettings.disable_rerank_for_streaming,
        multilingual_expansion: searchSettings.multilingual_expansion,
        multipass_indexing: searchSettings.multipass_indexing,
      });
      setRerankingDetails({
        api_key: searchSettings.api_key,
        num_rerank: searchSettings.num_rerank,
        provider_type: searchSettings.provider_type,
        rerank_model_name: searchSettings.rerank_model_name,
      });
    }
  }, [searchSettings]);

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

  const updateSearch = async () => {
    let values: SavedSearchSettings = {
      ...rerankingDetails,
      ...advancedEmbeddingDetails,
    };
    const response = await updateSearchSettings(values);
    if (response.ok) {
      setPopup({
        message: "Updated search settings succesffuly",
        type: "success",
      });
      mutate("/api/search-settings/get-search-settings");
      return true;
    } else {
      setPopup({ message: "Failed to update search settings", type: "error" });
      return false;
    }
  };

  const onConfirm = async () => {
    let newModel: EmbeddingModelDescriptor;

    if ("cloud_provider_name" in selectedProvider) {
      // This is a CloudEmbeddingModel
      newModel = {
        ...selectedProvider,
        model_name: selectedProvider.model_name,
        cloud_provider_name: selectedProvider.cloud_provider_name,
      };
    } else {
      // This is an EmbeddingModelDescriptor
      newModel = {
        ...selectedProvider,
        model_name: selectedProvider.model_name!,
        description: "",
        cloud_provider_name: null,
      };
    }

    const response = await fetch(
      "/api/search-settings/set-new-embedding-model",
      {
        method: "POST",
        body: JSON.stringify(newModel),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    if (response.ok) {
      setPopup({
        message: "Changed provider suceessfully. Redirecing to embedding page",
        type: "success",
      });
      mutate("/api/search-settings/get-secondary-embedding-model");
      setTimeout(() => {
        window.open("/admin/configuration/search", "_self");
      }, 2000);
    } else {
      setPopup({ message: "Failed to update embedding model", type: "error" });

      alert(`Failed to update embedding model - ${await response.text()}`);
    }
  };

  const onCancel = async () => {
    const response = await fetch("/api/search-settings/cancel-new-embedding", {
      method: "POST",
    });
    if (response.ok) {
      // setShowTentativeModel(null);
      // mutate("/api/search-settings/get-secondary-embedding-model");
    } else {
      alert(
        `Failed to cancel embedding model update - ${await response.text()}`
      );
    }
  };

  const needsReIndex = currentEmbeddingModel != selectedProvider;

  return (
    <div className="mx-auto mb-8 w-full">
      {popup}

      <div className="mb-4">
        <HealthCheckBanner />
      </div>
      <div className="mx-auto max-w-4xl">
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

            <Card>
              <EmbeddingModelSelection
                currentEmbeddingModel={selectedProvider}
                updateSelectedProvider={updateSelectedProvider}
              />
            </Card>
            <div className=" mt-4 flex w-full justify-end">
              <button
                className="enabled:cursor-pointer disabled:cursor-not-allowed disabled:bg-blue-200 bg-blue-400 flex gap-x-1 items-center text-white py-2.5 px-3.5 text-sm font-regular rounded-sm"
                disabled={selectedProvider == null}
                onClick={() => nextFormStep()}
              >
                Continue
                <ArrowRight />
              </button>
            </div>
          </>
        )}

        {formStep == 1 && (
          <>
            <h2 className="text-2xl font-bold mb-4 text-text-800">
              Post-processing configuration
            </h2>
            <Text className="mb-4">
              Configure your re-ranking functionality.
            </Text>
            <Card>
              <RerankingDetailsForm
                currentRerankingDetails={rerankingDetails}
                setRerankingDetails={setRerankingDetails}
              />
            </Card>

            <div className={` mt-4 w-full grid grid-cols-3`}>
              <button
                className="border-border-dark mr-auto border flex gap-x-1 items-center text-text p-2.5 text-sm font-regular rounded-sm "
                onClick={() => prevFormStep()}
              >
                <ArrowLeft />
                Previous
              </button>

              {needsReIndex ? (
                <div className="flex mx-auto gap-x-1 ml-auto  items-center">
                  <button
                    className="enabled:cursor-pointer  disabled:bg-accent/50 disabled:cursor-not-allowed bg-accent flex  gap-x-1 items-center text-white py-2.5 px-3.5 text-sm font-regular rounded-sm"
                    onClick={async () => {
                      const updated = await updateSearch();
                      if (updated) {
                        await onConfirm();
                      }
                    }}
                  >
                    Re-index
                  </button>
                  <CustomTooltip
                    medium
                    content={
                      <p>
                        Needs reindexing due to:
                        <li className="list-disc">
                          Changed embedding provider
                        </li>
                      </p>
                    }
                  >
                    <WarningCircle className="text-text-800" />
                  </CustomTooltip>
                </div>
              ) : (
                <button
                  className="enabled:cursor-pointer ml-auto disabled:bg-accent/50 disabled:cursor-not-allowed bg-accent flex mx-auto gap-x-1 items-center text-white py-2.5 px-3.5 text-sm font-regular rounded-sm"
                  onClick={async () => {
                    updateSearch();
                  }}
                >
                  Update Search
                </button>
              )}

              <div className="flex w-full justify-end">
                <button
                  className={`enabled:cursor-pointer enabled:hover:underline disabled:cursor-not-allowed mt-auto enabled:text-text-600 disabled:text-text-400 ml-auto flex gap-x-1 items-center py-2.5 px-3.5 text-sm font-regular rounded-sm`}
                  // disabled={!isFormValid}
                  onClick={() => {
                    nextFormStep();
                  }}
                >
                  Advanced
                  <ArrowRight />
                </button>
              </div>
            </div>
          </>
        )}
        {formStep == 2 && (
          <>
            <Card>
              <AdvancedEmbeddingFormPage
                advancedEmbeddingDetails={advancedEmbeddingDetails}
                updateAdvancedEmbeddingDetails={updateAdvancedEmbeddingDetails}
              />
            </Card>

            <div className={`mt-4 grid  grid-cols-3 w-full `}>
              <button
                className="border-border-dark border mr-auto flex gap-x-1 items-center text-text py-2.5 px-3.5 text-sm font-regular rounded-sm"
                onClick={() => prevFormStep()}
              >
                <ArrowLeft />
                Previous
              </button>

              {needsReIndex ? (
                <div className="flex mx-auto gap-x-1 ml-auto  items-center">
                  <button
                    className="enabled:cursor-pointer  disabled:bg-accent/50 disabled:cursor-not-allowed bg-accent flex  gap-x-1 items-center text-white py-2.5 px-3.5 text-sm font-regular rounded-sm"
                    onClick={async () => {
                      const updated = await updateSearch();
                      if (updated) {
                        await onConfirm();
                      }
                    }}
                  >
                    Re-index
                  </button>
                  <CustomTooltip
                    medium
                    content={
                      <p>
                        Needs reindexing due to:
                        <li className="list-disc">
                          Changed embedding provider
                        </li>
                      </p>
                    }
                  >
                    <WarningCircle className="text-text-800" />
                  </CustomTooltip>
                </div>
              ) : (
                <button
                  className="enabled:cursor-pointer ml-auto disabled:bg-accent/50 disabled:cursor-not-allowed bg-accent flex mx-auto gap-x-1 items-center text-white py-2.5 px-3.5 text-sm font-regular rounded-sm"
                  onClick={async () => {
                    updateSearch();
                  }}
                >
                  Update Search
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
