import { useChatContext } from "@/components/context/ChatContext";
import { LlmOverride, LlmOverrideManager } from "@/lib/hooks";
import React, { useCallback, useRef, useState } from "react";
import { debounce } from "lodash";
import { DefaultDropdown, RegenerateDropdown } from "@/components/Dropdown";
import { Text } from "@tremor/react";
import { Persona } from "@/app/admin/assistants/interfaces";
import { getFinalLLM } from "@/lib/llm/utils";

import { Modal } from "@/components/Modal";
import { modelOverRideType } from "./ChatPage";
import { FiCheck } from "react-icons/fi";

export default function RegenerateOption({
  llmOverrideManager,
  selectedAssistant,
  onClose,
  regenerateID,
  messageIdToResend,
  alternateModel,
}: {
  alternateModel?: string;
  llmOverrideManager: LlmOverrideManager;
  selectedAssistant: Persona;
  onClose: () => void;
  messageIdToResend: number;
  regenerateID: (
    modelOverRide: modelOverRideType,
    messageIdToResend: number
  ) => void;
}) {
  const { llmProviders } = useChatContext();
  const [_, llmName] = getFinalLLM(llmProviders, selectedAssistant);
  const llmOptions: { name: string; value: string }[] = [];
  const structureValue = (
    name: string,
    provider: string,
    modelName: string
  ) => {
    return `${name}__${provider}__${modelName}`;
  };
  const destructureValue = (value: string): LlmOverride => {
    const [displayName, provider, modelName] = value.split("__");
    return {
      name: displayName,
      provider,
      modelName,
    };
  };
  llmProviders.forEach((llmProvider) => {
    llmProvider.model_names.forEach((modelName) => {
      llmOptions.push({
        name: modelName,
        value: structureValue(
          llmProvider.name,
          llmProvider.provider,
          modelName
        ),
      });
    });
  });

  const currentModelName =
    llmOverrideManager.llmOverride.modelName ||
    (selectedAssistant
      ? selectedAssistant.llm_model_version_override || llmName
      : llmName);

  return (
    <div className="group flex items-center relative">
      <RegenerateDropdown
        alternate={alternateModel}
        options={llmOptions}
        selected={currentModelName}
        onSelect={(value) => {
          const { provider, modelName } = destructureValue(value as string);
          regenerateID(
            { modelVersion: modelName, modelProvider: provider },
            messageIdToResend
          );
        }}
      />
    </div>
  );

  // <div className="group flex items-center">
  //   <RegenerateDropdown
  //     options={llmOptions}
  //     selected={currentModelName}
  //     onSelect={(value) => {
  //       const { provider, modelName } = destructureValue(value as string);
  //       regenerateID(
  //         { modelVersion: modelName, modelProvider: provider },
  //         messageIdToResend
  //       );
  //     }}
  //   />
  //   <p
  //     className={`my-auto ml-1 ${!regenerateModal && "opacity-0"} text-xs group-hover:opacity-100 transition-all duration-300`}
  //   >
  //     {" "}
  //     {alternateModel || ""}
  //   </p>
  // </div>

  // );
}
