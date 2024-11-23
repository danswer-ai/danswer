import React, { useEffect, useState, useRef, useCallback } from "react";
import { useAssistants } from "@/components/context/AssistantsContext";
import { useChatContext } from "@/components/context/ChatContext";
import { useUser } from "@/components/user/UserProvider";
import { Persona } from "@/app/admin/assistants/interfaces";
import { LLMProviderDescriptor } from "@/app/admin/configuration/llm/interfaces";
import { FiChevronDown } from "react-icons/fi";
import { getFinalLLM, destructureValue } from "@/lib/llm/utils";
import { updateModelOverrideForChatSession } from "@/app/chat/lib";
import { debounce } from "lodash";
import { LlmList } from "@/components/llm/LLMList";
import { checkPersonaRequiresImageGeneration } from "@/app/admin/assistants/lib";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DraggableAssistantCard } from "@/components/assistants/AssistantCards";
import { updateUserAssistantList } from "@/lib/assistants/updateAssistantPreferences";
import Text from "@/components/ui/text";
import { GearIcon } from "@/components/icons/icons";
import { LlmOverrideManager } from "@/lib/hooks";

const AssistantSelector = ({
  liveAssistant,
  onAssistantChange,
  chatSessionId,
  llmOverrideManager,
}: {
  liveAssistant: Persona;
  onAssistantChange: (assistant: Persona) => void;
  chatSessionId?: string;
  llmOverrideManager?: LlmOverrideManager;
}) => {
  const { finalAssistants, refreshAssistants } = useAssistants();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { llmProviders } = useChatContext();
  const { refreshUser } = useUser();

  const [temperature, setTemperature] = useState<number>(0.7);
  const [isTemperatureExpanded, setIsTemperatureExpanded] = useState(false);
  const [localTemperature, setLocalTemperature] = useState<number>(temperature);

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

  const requiresImageGeneration =
    checkPersonaRequiresImageGeneration(liveAssistant);

  const [assistants, setAssistants] = useState<Persona[]>(finalAssistants);

  useEffect(() => {
    setAssistants(finalAssistants);
  }, [finalAssistants]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setIsTemperatureExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = assistants.findIndex(
        (item) => item.id.toString() === active.id
      );
      const newIndex = assistants.findIndex(
        (item) => item.id.toString() === over.id
      );
      const updatedAssistants = arrayMove(assistants, oldIndex, newIndex);

      setAssistants(updatedAssistants);
      await updateUserAssistantList(updatedAssistants.map((a) => a.id));
      await refreshUser();
      await refreshAssistants();
    }
  };

  const currentLlm = llmOverrideManager?.llmOverride?.modelName;
  const openModelSettings = () => {
    // Implement the function to open model settings if needed
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Button to open the dropdown */}
      <button
        aria-label={`Assistant selector, current assistant is ${liveAssistant.name}`}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex cursor-pointer items-center gap-1 rounded-lg px-3 text-lg  font-semibold text-text-secondary overflow-hidden whitespace-nowrap"
      >
        <div className="leading-tight text-text-900">{liveAssistant.name}</div>
        <FiChevronDown className="text-text-800" />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-2 w-[600px] max-h-[500px] overflow-auto rounded-md bg-white shadow-lg p-4">
          {/* Two Column Layout */}
          <div className="flex">
            {/* Left Column */}
            {/* Right Column */}
            <div className="w-1/2 pl-2">
              {/* Assistants List with Drag and Drop */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Change Assistant</h3>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={assistants.map((a) => a.id.toString())}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="pb-2  pr-2 max-h-96 overflow-y-auto">
                      {assistants.map((assistant) => (
                        <DraggableAssistantCard
                          key={assistant.id.toString()}
                          assistant={assistant}
                          isSelected={liveAssistant.id === assistant.id}
                          onSelect={(assistant) => {
                            onAssistantChange(assistant);
                            setIsOpen(false);
                          }}
                          llmName={currentLlm ?? llmProviders[0].model_names[0]}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </div>
            <div className="w-1/2 pr-2">
              {/* LLM Selection */}
              <div className="mb-4">
                <div className="flex w-full justify-between content-center mb-2 gap-x-2">
                  <label className="block text-lg font-semibold mb-2">
                    Choose Model
                  </label>
                </div>
                <LlmList
                  requiresImageGeneration={requiresImageGeneration}
                  llmProviders={llmProviders}
                  currentLlm={currentLlm ?? llmProviders[0].model_names[0]}
                  onSelect={(value: string | null) => {
                    if (value == null) {
                      return;
                    }

                    const { modelName, name, provider } =
                      destructureValue(value);
                    llmOverrideManager?.setLlmOverride({
                      name: name,
                      provider: provider,
                      modelName: modelName,
                    });
                    if (chatSessionId) {
                      updateModelOverrideForChatSession(chatSessionId, value);
                    }
                    // You may need to update any LLM override manager or context
                  }}
                />
              </div>

              {/* Temperature Control */}
              <div>
                <button
                  className="flex items-center text-sm font-medium transition-colors duration-200"
                  onClick={() =>
                    setIsTemperatureExpanded(!isTemperatureExpanded)
                  }
                >
                  <span className="mr-2 text-xs text-primary">
                    {isTemperatureExpanded ? "▼" : "►"}
                  </span>
                  <span>Temperature</span>
                </button>

                {isTemperatureExpanded && (
                  <>
                    <Text className="mt-2 mb-4">
                      Adjust the temperature of the LLM. Higher temperatures
                      will make the LLM generate more creative and diverse
                      responses, while lower temperatures will make the LLM
                      generate more conservative and focused responses.
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
                          left: `${(localTemperature / 2) * 100}%`,
                          transform: `translateX(-50%)`,
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
          </div>
        </div>
      )}
    </div>
  );
};

export default AssistantSelector;
