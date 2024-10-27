import { useChatContext } from "@/context/ChatContext";
import { getDisplayNameForModel, LlmOverrideManager } from "@/lib/hooks";
import React, { forwardRef, useCallback, useState } from "react";
import { debounce } from "lodash";
import { Text } from "@tremor/react";
import { Assistant } from "@/app/admin/assistants/interfaces";
import {
  checkLLMSupportsImageInput,
  destructureValue,
  structureValue,
} from "@/lib/llm/utils";
import { updateModelOverrideForChatSession } from "../../lib";
import { GearIcon } from "@/components/icons/icons";
import { LlmList } from "@/components/llm/LLMList";
import { checkAssistantRequiresImageGeneration } from "@/app/admin/assistants/lib";
import { CustomModal } from "@/components/CustomModal";
import { Thermometer } from "lucide-react";

interface LlmTabProps {
  llmOverrideManager: LlmOverrideManager;
  currentLlm: string;
  openModelSettings: () => void;
  chatSessionId?: number;
  close: () => void;
  currentAssistant: Assistant;
}

export const LlmTab = forwardRef<HTMLDivElement, LlmTabProps>(
  (
    {
      llmOverrideManager,
      chatSessionId,
      currentLlm,
      close,
      openModelSettings,
      currentAssistant,
    },
    ref
  ) => {
    const requiresImageGeneration =
      checkAssistantRequiresImageGeneration(currentAssistant);

    const { llmProviders } = useChatContext();
    const { setLlmOverride, temperature, setTemperature } = llmOverrideManager;
    const [isTemperatureExpanded, setIsTemperatureExpanded] = useState(false);
    const [localTemperature, setLocalTemperature] = useState<number>(
      temperature || 0
    );

    const debouncedSetTemperature = useCallback(
      (value: number) => {
        const debouncedFunction = debounce((value: number) => {
          setTemperature(value);
        }, 300);
        return debouncedFunction(value);
      },
      [setTemperature]
    );

    const handleTemperatureChange = (value: number) => {
      setLocalTemperature(value);
      debouncedSetTemperature(value);
    };

    return (
      <div className="w-full">
        <div className="flex w-full justify-between content-center mb-2 gap-x-2">
          <label className="block text-sm font-medium">Choose Model</label>
          <button
            onClick={() => {
              close();
              openModelSettings();
            }}
          >
            <GearIcon />
          </button>
        </div>
        <LlmList
          requiresImageGeneration={requiresImageGeneration}
          llmProviders={llmProviders}
          currentLlm={currentLlm}
          onSelect={(value: string | null) => {
            if (value == null) {
              return;
            }
            setLlmOverride(destructureValue(value));
            if (chatSessionId) {
              updateModelOverrideForChatSession(chatSessionId, value as string);
            }
            close();
          }}
        />

        <div className="mt-4">
          <button
            className="flex items-center text-sm font-medium transition-colors duration-200"
            onClick={() => setIsTemperatureExpanded(!isTemperatureExpanded)}
          >
            <Thermometer />
        Temperature
          </button>

          {isTemperatureExpanded && (
            <CustomModal
            onClose={() => setIsTemperatureExpanded(false)}
            title="Adjust the temperature of the LLM."
            trigger={null}
            open={isTemperatureExpanded}
            >
              <Text className="mt-2 mb-8">
                Higher temperatures will make
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
            </CustomModal>
          )}
        </div>
      </div>
    );
  }
);
LlmTab.displayName = "LlmTab";