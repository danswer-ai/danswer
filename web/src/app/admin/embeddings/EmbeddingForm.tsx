"use client";
import { usePopup } from "@/components/admin/connectors/Popup";
import { AdminPageTitle } from "@/components/admin/Title";
import { useFormContext } from "@/components/context/EmbeddingContext";
import { HealthCheckBanner } from "@/components/health/healthcheck";

import { EmbeddingModelSelection } from "../configuration/search/EmbeddingModelSelectionForm";
import { useEffect, useState } from "react";
import { Card } from "@tremor/react";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import {
  CloudEmbeddingModel,
  EmbeddingModelDescriptor,
  HostedEmbeddingModel,
} from "../configuration/search/components/types";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { ErrorCallout } from "@/components/ErrorCallout";
import useSWR from "swr";
import { ThreeDotsLoader } from "@/components/Loading";

export default function EmbeddingForm() {
  const { setFormStep, setAlowCreate, formStep, nextFormStep, prevFormStep } =
    useFormContext();
  const { popup, setPopup } = usePopup();

  const [useLargeChunks, setUseLargeChunks] = useState(false);

  const [rerankingOption, setRerankingOption] = useState("cohere");
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [llmChunkFilter, setLlmChunkFilter] = useState(false);
  const [queryExpansion, setQueryExpansion] = useState(false);
  const [isFormValid, setisFormValid] = useState(false);
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
    "/api/secondary-index/get-current-embedding-model",
    errorHandlingFetcher,
    { refreshInterval: 5000 } // 5 seconds
  );

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

  const onConfirm = async (
    model: CloudEmbeddingModel | HostedEmbeddingModel
  ) => {
    let newModel: EmbeddingModelDescriptor;

    if ("cloud_provider_name" in model) {
      // This is a CloudEmbeddingModel
      newModel = {
        ...model,
        model_name: model.model_name,
        cloud_provider_name: model.cloud_provider_name,
      };
    } else {
      // This is an EmbeddingModelDescriptor
      newModel = {
        ...model,
        model_name: model.model_name!,
        description: "",
        cloud_provider_name: null,
      };
    }

    const response = await fetch(
      "/api/secondary-index/set-new-embedding-model",
      {
        method: "POST",
        body: JSON.stringify(newModel),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    if (response.ok) {
      // setShowTentativeOpenProvider(null);
      // setShowTentativeModel(null);
      // mutate("/api/secondary-index/get-secondary-embedding-model");
      // if (!connectors || !connectors.length) {
      //     setShowAddConnectorPopup(true);
      // }
    } else {
      alert(`Failed to update embedding model - ${await response.text()}`);
    }
  };

  const onCancel = async () => {
    const response = await fetch("/api/secondary-index/cancel-new-embedding", {
      method: "POST",
    });
    if (response.ok) {
      // setShowTentativeModel(null);
      // mutate("/api/secondary-index/get-secondary-embedding-model");
    } else {
      alert(
        `Failed to cancel embedding model update - ${await response.text()}`
      );
    }
    // setIsCancelling(false);
  };

  return (
    <div className="mx-auto mb-8 w-full">
      {popup}
      <div className="mb-4">
        <HealthCheckBanner />
      </div>

      <AdminPageTitle
        includeDivider={false}
        icon={<div />}
        title={"Embedding update"}
      />
      {formStep == 0 && (
        <>
          <Card>
            <EmbeddingModelSelection
              currentEmbeddingModel={selectedProvider}
              updateSelectedProvider={updateSelectedProvider}
            />
          </Card>
          <div className="mt-4 flex w-full justify-end">
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
          <Card></Card>

          <div className={`mt-4 w-full grid grid-cols-3`}>
            <button
              className="border-border-dark mr-auto border flex gap-x-1 items-center text-text p-2.5 text-sm font-regular rounded-sm "
              onClick={() => prevFormStep()}
            >
              <ArrowLeft />
              Previous
            </button>

            <button
              className="enabled:cursor-pointer ml-auto disabled:bg-accent/50 disabled:cursor-not-allowed bg-accent flex mx-auto gap-x-1 items-center text-white py-2.5 px-3.5 text-sm font-regular rounded-sm"
              disabled={!isFormValid}
              onClick={async () => {
                // await submi();
              }}
            >
              Create Connector
            </button>

            <div className="flex w-full justify-end">
              <button
                className={`enabled:cursor-pointer enabled:hover:underline disabled:cursor-not-allowed mt-auto enabled:text-text-600 disabled:text-text-400 ml-auto flex gap-x-1 items-center py-2.5 px-3.5 text-sm font-regular rounded-sm`}
                disabled={!isFormValid}
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
    </div>
  );
}
