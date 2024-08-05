import { useState } from "react";
import { ModalWrapper } from "./ModalWrapper";
import { Badge, Button, Text } from "@tremor/react";
import { SelectorFormField } from "@/components/admin/connectors/Field";
import { FiX } from "react-icons/fi";
import { getDisplayNameForModel, LlmOverride } from "@/lib/hooks";
import {
  FullLLMProvider,
  LLMProviderDescriptor,
} from "@/app/admin/models/llm/interfaces";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { destructureValue, getFinalLLM, structureValue } from "@/lib/llm/utils";
import { setUserDefaultModel } from "@/lib/users/UserSettings";
import { mutate } from "swr";
import { useRouter } from "next/navigation";

export function SetDefaultModelModal({
  llmProviders,
  onClose,
  globalModel,
}: {
  llmProviders: LLMProviderDescriptor[];
  onClose: () => void;
  globalModel: string | null;
}) {
  const globalModelDestructured = globalModel
    ? destructureValue(globalModel)
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
  const handleChangeGlobalModel = async (globalModel: string | null) => {
    await setUserDefaultModel(globalModel);
    router.refresh();
  };

  return (
    <ModalWrapper
      onClose={onClose}
      modalClassName="rounded-lg bg-white max-w-xl"
    >
      <>
        <div className="flex mb-4">
          <h2 className="text-2xl text-emphasis font-bold flex my-auto">
            Set Default Model
          </h2>
        </div>

        <Text className="mb-4">
          Select a default Large Language Model (Generative AI model) to power
          this Assistant.
          {globalModel == null && "  No default model has been selected!"}
        </Text>
        <div className="w-full flex text-sm flex-col">
          <div key={-1} className="w-full border-b hover:bg-gray-50">
            <td className="min-w-[80px]">
              {globalModel == null ? (
                <Badge>selected</Badge>
              ) : (
                <input
                  type="radio"
                  name="credentialSelection"
                  onChange={(e) => {
                    e.preventDefault();
                    handleChangeGlobalModel(null);
                  }}
                  className="form-radio ml-4 h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
                />
              )}
            </td>
            <td className="p-2">System default</td>
          </div>

          {llmOptions.map(({ name, value }, index) => {
            return (
              <div key={index} className="w-full border-b hover:bg-gray-50">
                <td className="min-w-[80px]">
                  {globalModelDestructured?.modelName != name ? (
                    <input
                      type="radio"
                      name="credentialSelection"
                      onChange={(e) => {
                        e.preventDefault();
                        handleChangeGlobalModel(value);
                      }}
                      className="form-radio ml-4 h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
                    />
                  ) : (
                    <Badge>selected</Badge>
                  )}
                </td>
                <td className="p-2">
                  {getDisplayNameForModel(name)}{" "}
                  {globalModelDestructured &&
                    globalModelDestructured.name == name &&
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
