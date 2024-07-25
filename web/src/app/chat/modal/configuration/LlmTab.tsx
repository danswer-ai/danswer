import { useChatContext } from "@/components/context/ChatContext";
import {
  getDisplayNameForModel,
  LlmOverride,
  LlmOverrideManager,
} from "@/lib/hooks";
import React, { forwardRef, useCallback, useRef, useState } from "react";
import { debounce } from "lodash";
import { DefaultDropdown } from "@/components/Dropdown";
import { Text } from "@tremor/react";
import { Persona } from "@/app/admin/assistants/interfaces";
import { destructureValue, getFinalLLM, structureValue } from "@/lib/llm/utils";
import { updateModelOverrideForChatSession } from "../../lib";
import { Tooltip } from "@/components/tooltip/Tooltip";
import { InfoIcon } from "@/components/icons/icons";
import { CustomTooltip } from "@/components/tooltip/CustomTooltip";

interface LlmTabProps {
  llmOverrideManager: LlmOverrideManager;
  currentAssistant: Persona;
  chatSessionId?: number;
  close?: () => void;
}

export const LlmTab = forwardRef<HTMLDivElement, LlmTabProps>(
  ({ llmOverrideManager, currentAssistant, chatSessionId, close }, ref) => {
    const { llmProviders } = useChatContext();
    const { llmOverride, setLlmOverride, temperature, setTemperature } =
      llmOverrideManager;
    const [isTemperatureExpanded, setIsTemperatureExpanded] = useState(false);
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

    const [_, defaultLlmName] = getFinalLLM(
      llmProviders,
      currentAssistant,
      null
    );

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
        <div className="flex w-full content-center gap-x-2">
          <label className="block text-sm font-medium mb-2">Choose Model</label>
          <CustomTooltip
            content={`Override the default model for the ${currentAssistant.name} assistnat. The override will only apply for the current chat session`}
          >
            <InfoIcon className="ml-1 text-gray-400" />
          </CustomTooltip>
        </div>

        <Text className="mb-3">
          Default Model: <i className="font-medium">{defaultLlmName}</i>.
        </Text>
        <div className="max-h-[300px] flex flex-col gap-y-1 overflow-y-scroll">
          {llmOptions.map(({ name, value }, index) => {
            return (
              <button
                className="w-full py-1.5 px-2  text-sm text-left bg-background-100/50 hover:bg-background-100 rounded  "
                onClick={() => {
                  setLlmOverride(destructureValue(value));
                  if (chatSessionId) {
                    updateModelOverrideForChatSession(
                      chatSessionId,
                      value as string
                    );
                  }
                }}
              >
                {getDisplayNameForModel(name)}
              </button>
            );
          })}
        </div>
        <div className="mt-4">
          <button
            className="flex items-center text-sm font-medium mb-2 p-2 rounded hover:bg-background-100 transition-colors duration-200"
            onClick={() => setIsTemperatureExpanded(!isTemperatureExpanded)}
          >
            <span className="mr-2 text-primary">
              {isTemperatureExpanded ? "▼" : "►"}
            </span>
            <span>Temperature</span>
            <CustomTooltip content="Adjust the creativity level of the AI responses">
              <InfoIcon className="ml-2 text-gray-400" />
            </CustomTooltip>
          </button>

          {isTemperatureExpanded && (
            <>
              <Text className="mb-8">
                Adjust the temperature of the LLM. Higher temperatures will make
                the LLM generate more creative and diverse responses, while
                lower temperature will make the LLM generate more conservative
                and focused responses.
              </Text>

              <div className="relative w-full">
                <input
                  type="range"
                  onChange={(e) =>
                    handleTemperatureChange(parseFloat(e.target.value))
                  }
                  className="w-full p-2 border border-border rounded-md"
                  min="0"
                  max="2"
                  step="0.01"
                  value={localTemperature}
                />
                <div
                  className="absolute text-sm"
                  style={{
                    left: `${(localTemperature || 0) * 50}%`,
                    transform: `translateX(-${Math.min(
                      Math.max((localTemperature || 0) * 50, 10),
                      90
                    )}%)`,
                    top: "-1.5rem",
                  }}
                >
                  {localTemperature}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
);
LlmTab.displayName = "LlmTab";
