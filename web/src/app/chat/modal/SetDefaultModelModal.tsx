import { Dispatch, SetStateAction } from "react";
import { ModalWrapper } from "./ModalWrapper";
import { Badge, Text } from "@tremor/react";
import { getDisplayNameForModel, LlmOverride } from "@/lib/hooks";
import { LLMProviderDescriptor } from "@/app/admin/configuration/llm/interfaces";

import { destructureValue, structureValue } from "@/lib/llm/utils";
import { setUserDefaultModel } from "@/lib/users/UserSettings";
import { useRouter } from "next/navigation";
import { usePopup } from "@/components/admin/connectors/Popup";

export function SetDefaultModelModal({
  llmProviders,
  onClose,
  setLlmOverride,
  defaultModel,
}: {
  llmProviders: LLMProviderDescriptor[];
  setLlmOverride: Dispatch<SetStateAction<LlmOverride>>;
  onClose: () => void;
  defaultModel: string | null;
}) {
  const { popup, setPopup } = usePopup();

  const defaultModelDestructured = defaultModel
    ? destructureValue(defaultModel)
    : null;
  const modelOptionsByProvider = new Map<
    string,
    { name: string; value: string }[]
  >();
  llmProviders.forEach((llmProvider) => {
    const providerOptions = llmProvider.model_names.map(
      (modelName: string) => ({
        name: getDisplayNameForModel(modelName),
        value: modelName,
      })
    );
    modelOptionsByProvider.set(llmProvider.name, providerOptions);
  });

  const llmOptionsByProvider: {
    [provider: string]: { name: string; value: string }[];
  } = {};
  const uniqueModelNames = new Set<string>();

  llmProviders.forEach((llmProvider) => {
    if (!llmOptionsByProvider[llmProvider.provider]) {
      llmOptionsByProvider[llmProvider.provider] = [];
    }

    (llmProvider.display_model_names || llmProvider.model_names).forEach(
      (modelName) => {
        if (!uniqueModelNames.has(modelName)) {
          uniqueModelNames.add(modelName);
          llmOptionsByProvider[llmProvider.provider].push({
            name: modelName,
            value: structureValue(
              llmProvider.name,
              llmProvider.provider,
              modelName
            ),
          });
        }
      }
    );
  });

  const llmOptions = Object.entries(llmOptionsByProvider).flatMap(
    ([provider, options]) => [...options]
  );

  const router = useRouter();
  const handleChangedefaultModel = async (defaultModel: string | null) => {
    try {
      const response = await setUserDefaultModel(defaultModel);

      if (response.ok) {
        if (defaultModel) {
          setLlmOverride(destructureValue(defaultModel));
        }
        setPopup({
          message: "Default model updated successfully",
          type: "success",
        });
        router.refresh();
      } else {
        throw new Error("Failed to update default model");
      }
    } catch (error) {
      setPopup({
        message: "Failed to update default model",
        type: "error",
      });
    }
  };
  const defaultProvider = llmProviders.find(
    (llmProvider) => llmProvider.is_default_provider
  );

  return (
    <ModalWrapper
      onClose={onClose}
      modalClassName="rounded-lg bg-white max-w-xl"
    >
      <>
        {popup}
        <div className="flex mb-4">
          <h2 className="text-2xl text-emphasis font-bold flex my-auto">
            Set Default Model
          </h2>
        </div>

        <Text className="mb-4">
          Choose a Large Language Model (LLM) to serve as the default for
          assistants that don&apos;t have a default model assigned.
          {defaultModel == null && "  No default model has been selected!"}
        </Text>
        <div className="w-full flex text-sm flex-col">
          <div
            key={-1}
            className="w-full border-b flex items-center gap-x-2 hover:bg-background-50"
          >
            <input
              checked={defaultModelDestructured?.modelName == null}
              type="radio"
              name="credentialSelection"
              onChange={(e) => {
                e.preventDefault();
                handleChangedefaultModel(null);
              }}
              className="form-radio ml-4 h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
            />
            {
              <td className="p-2">
                System default{" "}
                {defaultProvider?.default_model_name &&
                  `(${getDisplayNameForModel(defaultProvider?.default_model_name)})`}
              </td>
            }
          </div>

          {llmOptions.map(({ name, value }, index) => {
            return (
              <div
                key={index}
                className="w-full flex items-center gap-x-2 border-b hover:bg-background-50"
              >
                <input
                  checked={defaultModelDestructured?.modelName == name}
                  type="radio"
                  name="credentialSelection"
                  onChange={(e) => {
                    e.preventDefault();
                    handleChangedefaultModel(value);
                  }}
                  className="form-radio ml-4 h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
                />

                <td className="p-2">
                  {getDisplayNameForModel(name)}{" "}
                  {defaultModelDestructured &&
                    defaultModelDestructured.name == name &&
                    "(selected)"}
                </td>
              </div>
            );
          })}
        </div>
      </>
    </ModalWrapper>
  );
}
