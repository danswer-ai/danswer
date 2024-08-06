import { useChatContext } from "@/components/context/ChatContext";
import { LlmOverride, LlmOverrideManager } from "@/lib/hooks";
import React, { useCallback, useRef, useState } from "react";
import { debounce } from "lodash";
import { DefaultDropdown } from "@/components/Dropdown";
import { Text } from "@tremor/react";
import { Persona } from "@/app/admin/assistants/interfaces";
import { destructureValue, getFinalLLM, structureValue } from "@/lib/llm/utils";
import { updateModelOverrideForChatSession } from "../../lib";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LlmTab({
  llmOverrideManager,
  currentAssistant,
  chatSessionId,
}: {
  llmOverrideManager: LlmOverrideManager;
  currentAssistant: Persona;
  chatSessionId?: number;
}) {
  const { llmProviders } = useChatContext();
  const { llmOverride, setLlmOverride, temperature, setTemperature } =
    llmOverrideManager;

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

  const [_, defaultLlmName] = getFinalLLM(llmProviders, currentAssistant, null);

  const llmOptions: { name: string; value: string }[] = [];
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

  return (
    <div>
      <label className="block text-sm font-semibold pb-2 text-black">
        Choose Model
      </label>
      <Text className="pb-1">
        Override the default model for the{" "}
        <b className="font-medium">{currentAssistant.name}</b> assistant. The
        override will apply only for this chat session.
      </Text>
      <Text className="pb-5 pt-3">
        Default Model: <i className="font-medium">{defaultLlmName}</i>.
      </Text>

      <div className="w-96">
        <Select
          onValueChange={(value) => {
            setLlmOverride(destructureValue(value as string));
            if (chatSessionId) {
              updateModelOverrideForChatSession(chatSessionId, value as string);
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an option...">
              {llmOverride.modelName}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {llmOptions.map((option, index) => (
              <SelectItem key={index} value={option.value}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <label className="block text-black text-sm font-semibold pb-2 pt-6">
        Temperature
      </label>

      <Text className="mb-8">
        Adjust the temperature of the LLM. Higher temperature will make the LLM
        generate more creative and diverse responses, while lower temperature
        will make the LLM generate more conservative and focused responses.
      </Text>

      <div className="relative w-full">
        <Slider
          onValueChange={(value) => handleTemperatureChange(value[0])}
          min={0}
          max={2}
          step={0.01}
          value={[localTemperature]}
          className="slider"
        />
        <div
          className="absolute text-sm"
          style={{
            left: `${(localTemperature || 0) * 50}%`,
            transform: `translateX(-${Math.min(
              Math.max((localTemperature || 0) * 50, 10),
              90
            )}%)`,
            top: "-2rem",
          }}
        >
          {localTemperature}
        </div>
      </div>
    </div>
  );
}
