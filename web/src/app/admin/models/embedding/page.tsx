"use client";

import { ThreeDotsLoader } from "@/components/Loading";
import { AdminPageTitle } from "@/components/admin/Title";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { Button, Text, Title } from "@tremor/react";
import { FiPackage } from "react-icons/fi";
import useSWR, { mutate } from "swr";
import { ModelOption } from "./components/ModelSelector";
import { useState } from "react";
import { ReindexingProgressTable } from "./components/ReindexingProgressTable";
import { Modal } from "@/components/Modal";
import {
  CloudEmbeddingProvider,
  CloudEmbeddingModel,
  AVAILABLE_CLOUD_MODELS,
  AVAILABLE_MODELS,
  INVALID_OLD_MODEL,
  fillOutEmeddingModelDescriptor,
  EmbeddingModelDescriptor,
} from "./components/types";
import { ErrorCallout } from "@/components/ErrorCallout";
import { Connector, ConnectorIndexingStatus } from "@/lib/types";
import Link from "next/link";

import OpenSourceEmbeddingSelectionPage from "./OpenSourceEmbeddingSelectionPage";
import CloudEmbeddingPage from "./CloudEmbeddingPage";
import { ProviderCreationModal2 } from "./modals/ProviderCreation";
import { ModelNotConfiguredModal } from "./modals/ModelNotConfigured";
import { DeleteCredentialsModal } from "./modals/DeleteCredentials";
import { ChangeModelModal } from "./modals/ChangeModel";
import { SelectModelModal } from "./modals/SelectModel";
import { ChangeCredentialsModal } from "./modals/ChangeCredentials";
import { ModelSelectionConfirmationModal } from "./modals/ModelSelection";
import { EMBEDDING_PROVIDERS_ADMIN_URL } from "../llm/constants";

export interface EmbeddingDetails {
  api_key: string;
  custom_config: any;
  default_model_id?: number;
  name: string;
}

function Main() {
  const [openToggle, setOpenToggle] = useState(true);
  const [tentativelyNewProvider, setTentativelyNewProvider] =
    useState<CloudEmbeddingProvider | null>(null);

  const [newEnabledProviders, setNewEnabledProviders] = useState<string[]>([]);
  const [newUnenabledProviders, setNewUnenabledProviders] = useState<string[]>(
    []
  );

  const [showModelNotConfiguredModal, setShowModelNotConfiguredModal] =
    useState<CloudEmbeddingProvider | null>(null);
  const [showChangeModelModal, setShowChangeModelModal] = useState(false);
  const [showDeleteCredentialsModal, setShowDeleteCredentialsModal] =
    useState(false);
  const [changeCredentials, setChangeCredentials] =
    useState<CloudEmbeddingProvider | null>(null);
  const [tentativeNewCloudEmbeddingModel, setTentativeNewCloudEmbeddingModel] =
    useState<CloudEmbeddingModel | null>(null);
  const [tentativeNewOpenmbeddingModel, setTentativeNewOpenEmbeddingModel] =
    useState<EmbeddingModelDescriptor | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [showAddConnectorPopup, setShowAddConnectorPopup] =
    useState<boolean>(false);

  const {
    data: currentEmeddingModel,
    isLoading: isLoadingCurrentModel,
    error: currentEmeddingModelError,
  } = useSWR<EmbeddingModelDescriptor>(
    "/api/secondary-index/get-current-embedding-model",
    errorHandlingFetcher,
    { refreshInterval: 5000 } // 5 seconds
  );

  const { data: embeddingProviderDetails } = useSWR<EmbeddingDetails[]>(
    EMBEDDING_PROVIDERS_ADMIN_URL,
    errorHandlingFetcher
  );

  const {
    data: futureEmbeddingModel,
    isLoading: isLoadingFutureModel,
    error: futureEmeddingModelError,
  } = useSWR<EmbeddingModelDescriptor | null>(
    "/api/secondary-index/get-secondary-embedding-model",
    errorHandlingFetcher,
    { refreshInterval: 5000 } // 5 seconds
  );
  const {
    data: ongoingReIndexingStatus,
    isLoading: isLoadingOngoingReIndexingStatus,
  } = useSWR<ConnectorIndexingStatus<any, any>[]>(
    "/api/manage/admin/connector/indexing-status?secondary_index=true",
    errorHandlingFetcher,
    { refreshInterval: 5000 } // 5 seconds
  );
  const { data: connectors } = useSWR<Connector<any>[]>(
    "/api/manage/connector",
    errorHandlingFetcher,
    { refreshInterval: 5000 } // 5 seconds
  );

  const onConfirm = async (
    model: CloudEmbeddingModel | EmbeddingModelDescriptor
  ) => {
    if (!model.model_name) {
      model.model_name = model?.name;
      model.cloud_provider_id = 0;
    }
    // model.model_name = model.name
    const response = await fetch(
      "/api/secondary-index/set-new-embedding-model",
      {
        method: "POST",
        body: JSON.stringify(model),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    if (response.ok) {
      setTentativeNewCloudEmbeddingModel(null);
      mutate("/api/secondary-index/get-secondary-embedding-model");
      if (!connectors || !connectors.length) {
        setShowAddConnectorPopup(true);
      }
    } else {
      alert(`Failed to update embedding model - ${await response.text()}`);
    }
  };

  const onCancel = async () => {
    const response = await fetch("/api/secondary-index/cancel-new-embedding", {
      method: "POST",
    });
    if (response.ok) {
      setTentativeNewCloudEmbeddingModel(null);
      mutate("/api/secondary-index/get-secondary-embedding-model");
    } else {
      alert(
        `Failed to cancel embedding model update - ${await response.text()}`
      );
    }
    setIsCancelling(false);
  };

  if (isLoadingCurrentModel || isLoadingFutureModel) {
    return <ThreeDotsLoader />;
  }

  if (
    currentEmeddingModelError ||
    !currentEmeddingModel ||
    futureEmeddingModelError
  ) {
    return <ErrorCallout errorTitle="Failed to fetch embedding model status" />;
  }

  const onConfirmSelection = async (model: EmbeddingModelDescriptor) => {
    const response = await fetch(
      "/api/secondary-index/set-new-embedding-model",
      {
        method: "POST",
        body: JSON.stringify(model),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    if (response.ok) {
      setTentativeNewCloudEmbeddingModel(null);
      mutate("/api/secondary-index/get-secondary-embedding-model");
      if (!connectors || !connectors.length) {
        setShowAddConnectorPopup(true);
      }
    } else {
      alert(`Failed to update embedding model - ${await response.text()}`);
    }
  };

  const currentModelName = currentEmeddingModel?.model_name;
  const currentModel =
    AVAILABLE_MODELS.find((model) => model.model_name === currentModelName) ||
    fillOutEmeddingModelDescriptor(currentEmeddingModel);

  const onSelectOpenSource = async (model: EmbeddingModelDescriptor) => {
    if (currentEmeddingModel?.model_name === INVALID_OLD_MODEL) {
      await onConfirmSelection(model);
    } else {
      setTentativeNewOpenEmbeddingModel(model);
    }
  };

  const selectedModel = AVAILABLE_CLOUD_MODELS[0];

  const handleChangeCredentials = async (apiKey: string) => {
    console.log(
      `Changing credentials for ${tentativelyNewProvider?.name} with new API key: ${apiKey}`
    );
    setChangeCredentials(null);
  };

  const clientsideAddProvider = (provider: CloudEmbeddingProvider) => {
    const providerName = provider.name;
    setNewEnabledProviders((newEnabledProviders) => [
      ...newEnabledProviders,
      providerName,
    ]);
    setNewUnenabledProviders((newUnenabledProviders) =>
      newUnenabledProviders.filter(
        (givenProvidername) => givenProvidername != providerName
      )
    );
  };

  const clientsideRemoveProvider = (provider: CloudEmbeddingProvider) => {
    const providerName = provider.name;
    setNewEnabledProviders((newEnabledProviders) =>
      newEnabledProviders.filter(
        (givenProvidername) => givenProvidername != providerName
      )
    );
    setNewUnenabledProviders((newUnenabledProviders) => [
      ...newUnenabledProviders,
      providerName,
    ]);
  };

  return (
    <div className="h-screen">
      <Text>
        Embedding models are used to generate embeddings for your documents,
        which then power Danswer&apos;s search.
      </Text>

      {tentativeNewOpenmbeddingModel && (
        <ModelSelectionConfirmationModal
          selectedModel={tentativeNewOpenmbeddingModel}
          isCustom={
            AVAILABLE_MODELS.find(
              (model) =>
                model.model_name === tentativeNewOpenmbeddingModel.model_name
            ) === undefined
          }
          onConfirm={() => onConfirm(tentativeNewOpenmbeddingModel)}
          onCancel={() => setTentativeNewOpenEmbeddingModel(null)}
        />
      )}
      {showModelNotConfiguredModal && (
        <ModelNotConfiguredModal
          modelProvider={showModelNotConfiguredModal}
          onConfirm={() => {
            setTentativelyNewProvider(showModelNotConfiguredModal);
            setShowModelNotConfiguredModal(null);
          }}
          onCancel={() => setShowModelNotConfiguredModal(null)}
        />
      )}

      {tentativelyNewProvider && (
        <ProviderCreationModal2
          selectedProvider={tentativelyNewProvider}
          onConfirm={() => {
            setTentativelyNewProvider(showModelNotConfiguredModal);
            setShowModelNotConfiguredModal(null);
            clientsideAddProvider(tentativelyNewProvider);
          }}
          onCancel={() => setTentativelyNewProvider(null)}
        />
      )}
      {changeCredentials && (
        <ChangeCredentialsModal
          onDeleted={() => {
            clientsideRemoveProvider(changeCredentials);
            setChangeCredentials(null);
          }}
          provider={changeCredentials}
          onConfirm={() => setChangeCredentials(null)}
          onCancel={() => setChangeCredentials(null)}
        />
      )}

      {tentativeNewCloudEmbeddingModel && (
        <SelectModelModal
          model={tentativeNewCloudEmbeddingModel}
          onConfirm={() => {
            onConfirm(tentativeNewCloudEmbeddingModel);
          }}
          onCancel={() => setTentativeNewCloudEmbeddingModel(null)}
        />
      )}

      {showChangeModelModal && (
        <ChangeModelModal
          existingModel={currentModel}
          newModel={tentativeNewCloudEmbeddingModel!}
          onConfirm={() => {
            setShowChangeModelModal(false);
            onConfirm(tentativeNewCloudEmbeddingModel!);
          }}
          onCancel={() => setShowChangeModelModal(false)}
        />
      )}

      {showDeleteCredentialsModal && (
        <DeleteCredentialsModal
          modelProvider={tentativelyNewProvider!}
          onConfirm={() => {
            setShowDeleteCredentialsModal(false);
          }}
          onCancel={() => setShowDeleteCredentialsModal(false)}
        />
      )}

      {currentModel ? (
        <>
          <Title className="mt-8 mb-2">Current Embedding Model</Title>
          <Text>
            <ModelOption model={currentModel} />
          </Text>
        </>
      ) : (
        <Title className="mt-8 mb-4">Choose your Embedding Model</Title>
      )}

      {!(futureEmbeddingModel && connectors && connectors.length > 0) && (
        <>
          <Title className="mt-8">Switch your Embedding Model</Title>
          <Text className="mb-4">
            If the current model is not working for you, you can update your
            model choice below. Note that this will require a complete
            re-indexing of all your documents across every connected source. We
            will take care of this in the background, but depending on the size
            of your corpus, this could take hours, day, or even weeks. You can
            monitor the progress of the re-indexing on this page.
          </Text>

          <div className="mt-8 text-sm  mr-auto  mb-12 divide-x-2  flex   ">
            <button
              onClick={() => setOpenToggle(true)}
              className={` mx-2 p-2 font-bold  ${openToggle ? "rounded bg-neutral-900 text-neutral-100 underline" : "hover:underline"}`}
            >
              Open source
            </button>
            <div className="px-2 ">
              <button
                onClick={() => setOpenToggle(false)}
                className={`mx-2 p-2 font-bold  ${!openToggle ? "rounded bg-neutral-900   text-neutral-100 underline" : " hover:underline"}`}
              >
                Hosted
              </button>
            </div>
          </div>
        </>
      )}

      {!showAddConnectorPopup &&
        !futureEmbeddingModel &&
        (openToggle ? (
          <OpenSourceEmbeddingSelectionPage
            onSelectOpenSource={onSelectOpenSource}
            currentModelName={currentModelName}
          />
        ) : (
          <CloudEmbeddingPage
            embeddingProviderDetails={embeddingProviderDetails}
            newEnabledProviders={newEnabledProviders}
            newUnenabledProviders={newUnenabledProviders}
            setTentativeNewEmbeddingModel={setTentativeNewCloudEmbeddingModel}
            setTentativelyNewProvider={setTentativelyNewProvider}
            selectedModel={selectedModel}
            setShowModelNotConfiguredModal={setShowModelNotConfiguredModal}
            setChangeCredentials={setChangeCredentials}
          />
        ))}

      {openToggle && (
        <>
          {showAddConnectorPopup && (
            <Modal>
              <div>
                <div>
                  <b className="text-base">
                    Embedding model successfully selected
                  </b>{" "}
                  🙌
                  <br />
                  <br />
                  To complete the initial setup, let&apos;s add a connector!
                  <br />
                  <br />
                  Connectors are the way that Danswer gets data from your
                  organization&apos;s various data sources. Once setup,
                  we&apos;ll automatically sync data from your apps and docs
                  into Danswer, so you can search all through all of them in one
                  place.
                </div>
                <div className="flex">
                  <Link
                    className="mx-auto mt-2 w-fit"
                    href="/admin/add-connector"
                  >
                    <Button className="mt-3 mx-auto" size="xs">
                      Add Connector
                    </Button>
                  </Link>
                </div>
              </div>
            </Modal>
          )}

          {isCancelling && (
            <Modal
              onOutsideClick={() => setIsCancelling(false)}
              title="Cancel Embedding Model Switch"
            >
              <div>
                <div>
                  Are you sure you want to cancel?
                  <br />
                  <br />
                  Cancelling will revert to the previous model and all progress
                  will be lost.
                </div>
                <div className="flex">
                  <Button
                    onClick={onCancel}
                    className="mt-3 mx-auto"
                    color="green"
                  >
                    Confirm
                  </Button>
                </div>
              </div>
            </Modal>
          )}
        </>
      )}

      {futureEmbeddingModel && connectors && connectors.length > 0 && (
        <div>
          <Title className="mt-8">Current Upgrade Status</Title>
          <div className="mt-4">
            <div className="italic text-sm mb-2">
              Currently in the process of switching to:{" "}
              {futureEmbeddingModel.model_name}
            </div>
            {/* <ModelOption model={futureEmbeddingModel} /> */}

            <Button
              color="red"
              size="xs"
              className="mt-4"
              onClick={() => setIsCancelling(true)}
            >
              Cancel
            </Button>

            <Text className="my-4">
              The table below shows the re-indexing progress of all existing
              connectors. Once all connectors have been re-indexed successfully,
              the new model will be used for all search queries. Until then, we
              will use the old model so that no downtime is necessary during
              this transition.
            </Text>

            {isLoadingOngoingReIndexingStatus ? (
              <ThreeDotsLoader />
            ) : ongoingReIndexingStatus ? (
              <ReindexingProgressTable
                reindexingProgress={ongoingReIndexingStatus}
              />
            ) : (
              <ErrorCallout errorTitle="Failed to fetch re-indexing progress" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Page() {
  return (
    <div className="mx-auto container">
      <AdminPageTitle
        title="Embedding"
        icon={<FiPackage size={32} className="my-auto" />}
      />

      <Main />
    </div>
  );
}

export default Page;
