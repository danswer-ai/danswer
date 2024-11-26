import React, {
  Dispatch,
  forwardRef,
  SetStateAction,
  useContext,
  useState,
} from "react";
import { Formik, Form, FormikProps } from "formik";
import * as Yup from "yup";
import {
  RerankerProvider,
  RerankingDetails,
  RerankingModel,
  rerankingModels,
} from "./interfaces";
import { FiExternalLink } from "react-icons/fi";
import {
  CohereIcon,
  LiteLLMIcon,
  MixedBreadIcon,
} from "@/components/icons/icons";
import { Modal } from "@/components/Modal";
import { TextFormField } from "@/components/admin/connectors/Field";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CustomModal } from "@/components/CustomModal";

interface RerankingDetailsFormProps {
  setRerankingDetails: Dispatch<SetStateAction<RerankingDetails>>;
  currentRerankingDetails: RerankingDetails;
  originalRerankingDetails: RerankingDetails;
  modelTab: "open" | "cloud" | null;
  setModelTab: Dispatch<SetStateAction<"open" | "cloud" | null>>;
}

const RerankingDetailsForm = forwardRef<
  FormikProps<RerankingDetails>,
  RerankingDetailsFormProps
>(
  (
    {
      setRerankingDetails,
      originalRerankingDetails,
      currentRerankingDetails,
      modelTab,
      setModelTab,
    },
    ref
  ) => {
    const [showGpuWarningModalModel, setShowGpuWarningModalModel] =
      useState<RerankingModel | null>(null);
    const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
    const [showLiteLLMConfigurationModal, setShowLiteLLMConfigurationModal] =
      useState(false);

    const combinedSettings = useContext(SettingsContext);
    const gpuEnabled = combinedSettings?.settings.gpu_enabled;

    return (
      <Formik
        innerRef={ref}
        initialValues={currentRerankingDetails}
        validationSchema={Yup.object().shape({
          rerank_model_name: Yup.string().nullable(),
          rerank_provider_type: Yup.mixed<RerankerProvider>()
            .nullable()
            .oneOf(Object.values(RerankerProvider))
            .optional(),
          api_key: Yup.string().nullable(),
          num_rerank: Yup.number().min(1, "Must be at least 1"),
          rerank_api_url: Yup.string()
            .url("Must be a valid URL")
            .matches(/^https?:\/\//, "URL must start with http:// or https://")
            .nullable(),
        })}
        onSubmit={async (_, { setSubmitting }) => {
          setSubmitting(false);
        }}
        enableReinitialize={true}
      >
        {({ values, setFieldValue, resetForm }) => {
          const resetRerankingValues = () => {
            setRerankingDetails(originalRerankingDetails);
            resetForm();
          };

          return (
            <div className="w-full">
              <h2 className="mb-4 text-2xl font-bold text-text-800">
                Post-processingss
              </h2>
              <div className="flex mb-6 mr-auto text-sm divide-x-2">
                {originalRerankingDetails.rerank_model_name && (
                  <button
                    onClick={() => setModelTab(null)}
                    className={`mx-2 p-2 font-bold  ${
                      !modelTab
                        ? "rounded bg-background-900 text-text-100 underline"
                        : " hover:underline bg-background-100"
                    }`}
                  >
                    Current
                  </button>
                )}
                <div
                  className={`${originalRerankingDetails.rerank_model_name && "px-2 ml-2"}`}
                >
                  <button
                    onClick={() => setModelTab("cloud")}
                    className={`mr-2 p-2 font-bold  ${
                      modelTab == "cloud"
                        ? "rounded bg-background-900 text-text-100 underline"
                        : " hover:underline bg-background-100"
                    }`}
                  >
                    Cloud-based
                  </button>
                </div>

                <div className="px-2">
                  <button
                    onClick={() => setModelTab("open")}
                    className={` mx-2 p-2 font-bold  ${
                      modelTab == "open"
                        ? "rounded bg-background-900 text-text-100 underline"
                        : "hover:underline bg-background-100"
                    }`}
                  >
                    Self-hosted
                  </button>
                </div>
                {values.rerank_model_name && (
                  <div className="px-2">
                    <button
                      onClick={() => resetRerankingValues()}
                      className="p-2 mx-2 font-bold rounded bg-background-100 text-text-900 hover:underline"
                    >
                      Remove Reranking
                    </button>
                  </div>
                )}
              </div>

              <Form>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {(modelTab
                    ? rerankingModels.filter(
                        (model) => model.cloud == (modelTab == "cloud")
                      )
                    : rerankingModels.filter(
                        (modelCard) =>
                          (modelCard.modelName ==
                            originalRerankingDetails.rerank_model_name &&
                            modelCard.rerank_provider_type ==
                              originalRerankingDetails.rerank_provider_type) ||
                          (modelCard.rerank_provider_type ==
                            RerankerProvider.LITELLM &&
                            originalRerankingDetails.rerank_provider_type ==
                              RerankerProvider.LITELLM)
                      )
                  ).map((card) => {
                    const isSelected =
                      values.rerank_provider_type ===
                        card.rerank_provider_type &&
                      (card.modelName == null ||
                        values.rerank_model_name === card.modelName);

                    return (
                      <div
                        key={`${card.rerank_provider_type}-${card.modelName}`}
                        className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 shadow-md"
                            : "border-gray-200 hover:border-blue-300 hover:shadow-sm"
                        }`}
                        onClick={() => {
                          if (
                            card.rerank_provider_type == RerankerProvider.COHERE
                          ) {
                            setIsApiKeyModalOpen(true);
                          } else if (
                            card.rerank_provider_type ==
                            RerankerProvider.LITELLM
                          ) {
                            setShowLiteLLMConfigurationModal(true);
                          } else if (
                            !card.rerank_provider_type &&
                            !gpuEnabled
                          ) {
                            setShowGpuWarningModalModel(card);
                          }

                          if (!isSelected) {
                            setRerankingDetails({
                              ...values,
                              rerank_provider_type: card.rerank_provider_type!,
                              rerank_model_name: card.modelName || null,
                              rerank_api_key: null,
                              rerank_api_url: null,
                            });
                            setFieldValue(
                              "rerank_provider_type",
                              card.rerank_provider_type
                            );
                            setFieldValue("rerank_model_name", card.modelName);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            {card.rerank_provider_type ===
                            RerankerProvider.LITELLM ? (
                              <LiteLLMIcon size={24} className="mr-2" />
                            ) : card.rerank_provider_type ===
                              RerankerProvider.COHERE ? (
                              <CohereIcon size={24} className="mr-2" />
                            ) : (
                              <MixedBreadIcon size={24} className="mr-2" />
                            )}
                            <h3 className="text-lg font-bold">
                              {card.displayName}
                            </h3>
                          </div>
                          {card.link && (
                            <a
                              href={card.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-500 transition-colors duration-200 hover:text-blue-700"
                            >
                              <FiExternalLink size={18} />
                            </a>
                          )}
                        </div>
                        <p className="mb-2 text-sm text-gray-600">
                          {card.description}
                        </p>
                        <div className="text-xs text-gray-500">
                          {card.cloud ? "Cloud-based" : "Self-hosted"}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <CustomModal
                  onClose={() => setShowGpuWarningModalModel(null)}
                  open={!!showGpuWarningModalModel}
                  trigger={null}
                  title="GPU Not Enabled"
                >
                  <>
                    <p className="font-semibold text-error">Warning:</p>
                    <p>
                      Local reranking models require significant computational
                      resources and may perform slowly without GPU acceleration.
                      Consider switching to GPU-enabled infrastructure or using
                      a cloud-based alternative for better performance.
                    </p>
                    <div className="flex justify-end mt-4">
                      <Button onClick={() => setShowGpuWarningModalModel(null)}>
                        Understood
                      </Button>
                    </div>
                  </>
                </CustomModal>

                <CustomModal
                  onClose={() => {
                    resetForm();
                    setShowLiteLLMConfigurationModal(false);
                  }}
                  title="API Key Configuration"
                  trigger={null}
                  open={showLiteLLMConfigurationModal}
                >
                  <div className="flex flex-col w-full px-4 gap-y-4">
                    <TextFormField
                      subtext="Set the URL at which your LiteLLM Proxy is hosted"
                      placeholder={values.rerank_api_url || undefined}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const value = e.target.value;
                        setRerankingDetails({
                          ...values,
                          rerank_api_url: value,
                        });
                        setFieldValue("rerank_api_url", value);
                      }}
                      type="text"
                      label="LiteLLM Proxy  URL"
                      name="rerank_api_url"
                    />

                    <TextFormField
                      subtext="Set the key to access your LiteLLM Proxy"
                      placeholder={
                        values.rerank_api_key
                          ? "*".repeat(values.rerank_api_key.length)
                          : undefined
                      }
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const value = e.target.value;
                        setRerankingDetails({
                          ...values,
                          rerank_api_key: value,
                        });
                        setFieldValue("rerank_api_key", value);
                      }}
                      type="password"
                      label="LiteLLM Proxy Key"
                      name="rerank_api_key"
                      optional
                    />

                    <TextFormField
                      subtext="Set the model name to use for LiteLLM Proxy"
                      placeholder={
                        values.rerank_model_name
                          ? "*".repeat(values.rerank_model_name.length)
                          : undefined
                      }
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const value = e.target.value;
                        setRerankingDetails({
                          ...values,
                          rerank_model_name: value,
                        });
                        setFieldValue("rerank_model_name", value);
                      }}
                      label="LiteLLM Model Name"
                      name="rerank_model_name"
                      optional
                    />

                    <div className="flex justify-end w-full mt-4">
                      <Button
                        onClick={() => {
                          setShowLiteLLMConfigurationModal(false);
                        }}
                      >
                        Update
                      </Button>
                    </div>
                  </div>
                </CustomModal>

                <CustomModal
                  onClose={() => {
                    Object.keys(originalRerankingDetails).forEach((key) => {
                      setFieldValue(
                        key,
                        originalRerankingDetails[key as keyof RerankingDetails]
                      );
                    });

                    setIsApiKeyModalOpen(false);
                  }}
                  title="API Key Configuration"
                  trigger={null}
                  open={isApiKeyModalOpen}
                >
                  <div className="w-full px-4">
                    <TextFormField
                      placeholder={
                        values.rerank_api_key
                          ? "*".repeat(values.rerank_api_key.length)
                          : undefined
                      }
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const value = e.target.value;
                        setRerankingDetails({
                          ...values,
                          rerank_api_key: value,
                        });
                        setFieldValue("api_key", value);
                      }}
                      type="password"
                      label="Cohere API Key"
                      name="rerank_api_key"
                    />
                    <div className="flex justify-end w-full mt-4">
                      <Button onClick={() => setIsApiKeyModalOpen(false)}>
                        Update
                      </Button>
                    </div>
                  </div>
                </CustomModal>
              </Form>
            </div>
          );
        }}
      </Formik>
    );
  }
);

RerankingDetailsForm.displayName = "RerankingDetailsForm";
export default RerankingDetailsForm;
