"use client";

import { ThreeDotsLoader } from "@/components/Loading";
import { AdminPageTitle } from "@/components/admin/Title";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { Button, Card, Text, Title } from "@tremor/react";
import { FiPackage } from "react-icons/fi";
import useSWR, { mutate } from "swr";
import { ModelOption, ModelSelector } from "./ModelSelector";
import { Provider, useState } from "react";
import { ModelSelectionConfirmationModal, ProviderCreationModal } from "./ModelSelectionConfirmation";
import { ReindexingProgressTable } from "./ReindexingProgressTable";
import { Modal } from "@/components/Modal";
import {
  AIProvider,
  AVAILABLE_CLOUD_MODELS,
  AVAILABLE_MODELS,
  EmbeddingModelDescriptor,
  FullCloudbasedEmbeddingModelDescriptor,
  INVALID_OLD_MODEL,
  fillOutEmeddingModelDescriptor,
  providers,
} from "./embeddingModels";
import { ErrorCallout } from "@/components/ErrorCallout";
import { Connector, ConnectorIndexingStatus } from "@/lib/types";
import Link from "next/link";
import { CustomModelForm } from "./CustomModelForm";
import { OpenAiLogo } from "@phosphor-icons/react";
import Image from "next/image";
import { FaConciergeBell, FaKey, FaLock } from "react-icons/fa";
import { ChangeCredentialsModal, ChangeModelModal, DeleteCredentialsModal, ModelNotConfiguredModal, SelectModelModal } from "./Providers";

function Main() {

  const [openToggle, setOpenToggle] = useState(true)


  const [tenativelyNewProvider, setTenativelyNewProvider] =
    useState<AIProvider | null>(null);
  const [showModelNotConfiguredModal, setShowModelNotConfiguredModal] = useState<AIProvider | null>(null);
  const [showSelectModelModal, setShowSelectModelModal] = useState(false);
  const [showChangeModelModal, setShowChangeModelModal] = useState(false);
  const [showDeleteCredentialsModal, setShowDeleteCredentialsModal] = useState(false);
  const [changeCredentials, setChangeCredentials] = useState<AIProvider | null>(null);


  const [tentativeNewCloudEmbeddingModel, setTentativeNewCloudEmbeddingModel] =
    useState<EmbeddingModelDescriptor | FullCloudbasedEmbeddingModelDescriptor | null>(null);


  const [tentativeNewEmbeddingModel, setTentativeNewEmbeddingModel] =
    useState<EmbeddingModelDescriptor | FullCloudbasedEmbeddingModelDescriptor | null>(null);
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

  const onSelect = async (model: EmbeddingModelDescriptor) => {
    if (currentEmeddingModel?.model_name === INVALID_OLD_MODEL) {
      await onConfirm(model);
    } else {
      setTentativeNewEmbeddingModel(model);
    }
  };


  const onConfirm = async (model: EmbeddingModelDescriptor) => {
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
      setTentativeNewEmbeddingModel(null);
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
      setTentativeNewEmbeddingModel(null);
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

  const currentModelName = currentEmeddingModel.model_name;
  const currentModel =
    AVAILABLE_MODELS.find((model) => model.model_name === currentModelName) ||
    fillOutEmeddingModelDescriptor(currentEmeddingModel);

  const newModelSelection = futureEmbeddingModel
    ? AVAILABLE_MODELS.find(
      (model) => model.model_name === futureEmbeddingModel.model_name
    ) || fillOutEmeddingModelDescriptor(futureEmbeddingModel)
    : null;

  const selectedModel = AVAILABLE_CLOUD_MODELS[0]

  const handleChangeCredentials = async (apiKey: string) => {
    // Implement the logic to change the credentials
    console.log(`Changing credentials for ${tenativelyNewProvider?.name} with new API key: ${apiKey}`);
    // You would typically make an API call here to update the credentials
    // After successful update:
    setChangeCredentials(null);
    // Optionally, refresh the provider data
    // mutate("/api/providers");
  };


  return (
    <div className="h-screen">

      <Text>
        Embedding models are used to generate embeddings for your documents,
        which then power Danswer&apos;s search.
      </Text>

      {showModelNotConfiguredModal && (
        <ModelNotConfiguredModal
          modelProvider={showModelNotConfiguredModal}
          onConfirm={() => {
            setTenativelyNewProvider(showModelNotConfiguredModal)
            setShowModelNotConfiguredModal(null);
            // Add logic to configure the model provider
          }}
          onCancel={() => setShowModelNotConfiguredModal(null)}
        />
      )}

      {changeCredentials && (
        <ChangeCredentialsModal
          provider={changeCredentials}
          onConfirm={handleChangeCredentials}
          onCancel={() => setChangeCredentials(null)}
        />
      )}



      {showSelectModelModal && (
        <SelectModelModal
          model={tentativeNewCloudEmbeddingModel as FullCloudbasedEmbeddingModelDescriptor}
          onConfirm={() => {
            setShowSelectModelModal(false);
            onConfirm(tentativeNewCloudEmbeddingModel!);
          }}
          onCancel={() => setShowSelectModelModal(false)}
        />
      )}

      {showChangeModelModal && (
        <ChangeModelModal
          existingModel={currentModel as FullCloudbasedEmbeddingModelDescriptor}
          newModel={tentativeNewCloudEmbeddingModel as FullCloudbasedEmbeddingModelDescriptor}
          onConfirm={() => {
            setShowChangeModelModal(false);
            onConfirm(tentativeNewCloudEmbeddingModel!);
          }}
          onCancel={() => setShowChangeModelModal(false)}
        />
      )}

      {showDeleteCredentialsModal && (
        <DeleteCredentialsModal
          modelProvider={tenativelyNewProvider!}
          onConfirm={() => {
            setShowDeleteCredentialsModal(false);
            // Add logic to delete credentials
          }}
          onCancel={() => setShowDeleteCredentialsModal(false)}
        />
      )}

      {currentModel ? (
        <>
          <Title className="mt-8">Switch your Embedding Model</Title>

          <Text className="mb-4">
            If the current model is not working for you, you can update
            your model choice below. Note that this will require a
            complete re-indexing of all your documents across every
            connected source. We will take care of this in the background,
            but depending on the size of your corpus, this could take
            hours, day, or even weeks. You can monitor the progress of the
            re-indexing on this page.
          </Text>

          {currentModel ? (
            <>
              <Title className="mt-8 mb-2">Current Embedding Model</Title>

              <Text>
                <ModelOption model={currentModel} />
              </Text>
            </>
          ) : (
            newModelSelection &&
            (!connectors || !connectors.length) && (
              <>
                <Title className="mt-8 mb-2">Current Embedding Model</Title>

                <Text>
                  <ModelOption model={newModelSelection} />
                </Text>
              </>
            )
          )}

        </>
      ) : (
        <>
          <Title className="mt-8 mb-4">Choose your Embedding Model</Title>
        </>
      )}

      <div className="mt-8 w-full mb-12  divide-x-2 divide-solid divide-black grid grid-cols-2 gap-x-2">
        <button onClick={() => setOpenToggle(true)} className={`py-4 font-bold ${openToggle ? " underline" : "hover:underline"}`}>
          Open source
        </button>


        <button onClick={() => setOpenToggle(false)} className={`font-bold ${!openToggle ? " underline" : "hover:underline"}`}>
          Hosted
        </button>
      </div>






      {!showAddConnectorPopup &&
        (!newModelSelection ?
          (
            openToggle ?
              <div>
                <ModelSelector
                  modelOptions={AVAILABLE_MODELS.filter(
                    (modelOption) => modelOption.model_name !== currentModelName
                  )}
                  setSelectedModel={onSelect}
                />

                <Title className="mt-8">Alternatively, here are some cloud-based models to choose from!</Title>

                <Text className="mb-4">
                  They require API keys and run in the cloud of the respective prodivers.
                </Text>

                {/* <ModelSelector
              modelOptions={AVAILABLE_CLOUD_MODELS.filter(
                (modelOption) => modelOption.model_name !== currentModelName
              )}
              setSelectedModel={onSelect}
            /> */}


                <Text className="mt-6">
                  Alternatively, (if you know what you&apos;re doing) you can
                  specify a{" "}
                  <a
                    target="_blank"
                    href="https://www.sbert.net/"
                    className="text-link"
                  >
                    SentenceTransformers
                  </a>
                  -compatible model of your choice below. The rough list of
                  supported models can be found{" "}
                  <a
                    target="_blank"
                    href="https://huggingface.co/models?library=sentence-transformers&sort=trending"
                    className="text-link"
                  >
                    here
                  </a>
                  .
                  <br />
                  <b>NOTE:</b> not all models listed will work with Danswer, since
                  some have unique interfaces or special requirements. If in doubt,
                  reach out to the Danswer team.
                </Text>

                <div className="w-full flex">
                  <Card className="mt-4 2xl:w-4/6 mx-auto">
                    <CustomModelForm onSubmit={onSelect} />
                  </Card>
                </div>
              </div>
              :
              <div>
                {currentModel ? (
                  <>
                    <Title className="mt-8">Configure Credentials</Title>
                  </>
                ) : (
                  <>
                    <Title className="mt-8 mb-4">Choose your Embedding Model</Title>
                  </>
                )}
                <div className="gap-4 mt-2 pb-10 flex content-start flex-wrap">
                  {providers.map((provider, ind) => {
                    const providerModels = AVAILABLE_CLOUD_MODELS.filter(model => model.provider_id === provider.id);
                    // const activeModel = activeModels[provider.id] || (providerModels[0]?.model_name ?? '');

                    return (
                      <div
                        key={ind}
                        className="p-4 border border-border rounded-lg shadow-md bg-hover-light w-96 flex flex-col"
                      >
                        <div className="font-bold text-neutral-900 text-lg items-center py-1 gap-x-2 flex">
                          {provider.icon({ size: 40 })}
                          <p className="my-auto">
                            {provider.name}
                          </p>
                          <button onClick={() => setTenativelyNewProvider(provider)} className="cursor-pointer ml-auto">
                            {!provider.configured && <FaLock />}
                          </button>
                        </div>
                        <div>{provider.description}</div>



                        <div className="mt-4">
                          {providerModels.map((model, index) => (
                            <div
                              key={index}
                              className={`p-3 mb-2 border-2  border-neutral-300 border-opacity-40 rounded-md rounded cursor-pointer ${provider.configured ? selectedModel.model_name == model.model_name ? 'bg-teal-50 border border-blue-300' : 'hover:bg-blue-50' : 'hover:bg-rose-50'
                                }`}
                              onClick={() => {
                                if (model.enabled) {
                                  return
                                }
                                else if (provider.configured) {
                                  setTentativeNewEmbeddingModel(model)
                                }
                                else {
                                  setShowModelNotConfiguredModal(provider)
                                }
                              }}
                            >
                              <div className="flex justify-between">
                                <div className="font-medium">{model.model_name}</div>
                                <p className="text-sm flex-none">
                                  {provider.configured ? model.enabled ? "Selected" : "Unselected" : "Unconfigured"}
                                </p>
                              </div>
                              <div className="text-sm text-gray-600">{model.description}</div>
                              <div className="text-xs text-gray-500">
                                Dimensions: {model.model_dim} | Price: ${model.pricePerMillion?.toFixed(3) ?? 'N/A'} per million tokens
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="text-sm  flex justify-between mt-1 mx-2">
                          <button onClick={() => {
                            if (provider.configured) {
                              setChangeCredentials(provider);
                            } else {

                              // setShowSelectModelModal(p)
                            }
                          }}
                            className="hover:underline cursor-pointer">
                            {provider.configured ? "Swap credentials" : 'Configure credentials'}
                          </button>
                          <a className="hover:underline cursor-pointer">
                            Learn more
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>


          ) : (
            connectors &&
            connectors.length > 0 && (
              <div>
                <Title className="mt-8">Current Upgrade Status</Title>
                <div className="mt-4">
                  <div className="italic text-sm mb-2">
                    Currently in the process of switching to:
                  </div>
                  <ModelOption model={newModelSelection} />

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
                    connectors. Once all connectors have been re-indexed
                    successfully, the new model will be used for all search
                    queries. Until then, we will use the old model so that no
                    downtime is necessary during this transition.
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
            )
          ))}


      {tentativeNewEmbeddingModel && (
        <ModelSelectionConfirmationModal
          selectedModel={tentativeNewEmbeddingModel}
          isCustom={
            AVAILABLE_MODELS.find(
              (model) =>
                model.model_name === tentativeNewEmbeddingModel.model_name
            ) === undefined
          }
          onConfirm={() => onConfirm(tentativeNewEmbeddingModel)}
          onCancel={() => setTentativeNewEmbeddingModel(null)}
        />
      )}

      {tentativeNewCloudEmbeddingModel && (
        <ModelSelectionConfirmationModal
          selectedModel={tentativeNewCloudEmbeddingModel}
          isCustom={
            AVAILABLE_MODELS.find(
              (model) =>
                model.model_name === tentativeNewCloudEmbeddingModel.model_name
            ) === undefined
          }
          onConfirm={() => onConfirm(tentativeNewCloudEmbeddingModel)}
          onCancel={() => setTentativeNewEmbeddingModel(null)}
        />
      )}

      {tenativelyNewProvider &&
        <ProviderCreationModal
          selectedProvider={tenativelyNewProvider}
          onConfirm={() => null}
          onCancel={() => setTenativelyNewProvider(null)}
        />
      }






      {openToggle &&
        <>
          {showAddConnectorPopup && (
            <Modal>
              <div>
                <div>
                  <b className="text-base">Embeding model successfully selected</b>{" "}
                  🙌
                  <br />
                  <br />
                  To complete the initial setup, let&apos;s add a connector!
                  <br />
                  <br />
                  Connectors are the way that Danswer gets data from your
                  organization&apos;s various data sources. Once setup, we&apos;ll
                  automatically sync data from your apps and docs into Danswer, so
                  you can search all through all of them in one place.
                </div>
                <div className="flex">
                  <Link className="mx-auto mt-2 w-fit" href="/admin/add-connector">
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
                  Cancelling will revert to the previous model and all progress will
                  be lost.
                </div>
                <div className="flex">
                  <Button onClick={onCancel} className="mt-3 mx-auto" color="green">
                    Confirm
                  </Button>
                </div>
              </div>
            </Modal>
          )}


        </>
      }
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
