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

export default function RegenerateOption({
  llmOverrideManager,
  selectedAssistant,
  onClose,
  regenerateID,
  messageIdToResend,
}: {
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
  const { llmOverride, setLlmOverride, temperature, setTemperature } =
    llmOverrideManager;

  // const { llmProviders } = useChatContext();
  const [_, llmName] = getFinalLLM(llmProviders, selectedAssistant);

  const [localTemperature, setLocalTemperature] = useState<number>(
    temperature || 0
  );

  const debouncedSetTemperature = useCallback(
    debounce((value) => {
      setTemperature(value);
    }, 300),
    []
  );

  const handleTemperatureChange = (value: number) => {
    setLocalTemperature(value);
    debouncedSetTemperature(value);
  };

  type modelValues = {
    modelName: string;
    provider: string;
  };
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
    <RegenerateDropdown
      options={llmOptions}
      selected={currentModelName}
      onSelect={
        (value) =>
          // TODO change of course
          // console.log(value)
          {
            const { name, provider, modelName } = destructureValue(
              value as string
            );
            // console.log({ modelVersion: modelName, modelProvider: provider})

            // console.log(messageIdToResend)
            regenerateID(
              { modelVersion: modelName, modelProvider: provider },
              messageIdToResend
            );
          }
        // setLlmOverride(destructureValue(value as string))
      }
    />
  );
}
