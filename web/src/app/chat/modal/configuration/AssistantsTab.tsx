import { Persona } from "@/app/admin/assistants/interfaces";
import { LLMProviderDescriptor } from "@/app/admin/models/llm/interfaces";
import { AssistantTools } from "@/app/assistants/ToolsDisplay";
import { Bubble } from "@/components/Bubble";
import { AssistantIcon } from "@/components/assistants/AssistantIcon";
import { getDisplayNameForModel } from "@/lib/hooks";
import { getFinalLLM } from "@/lib/llm/utils";
import React from "react";
import { FiBookmark, FiPlus } from "react-icons/fi";

interface AssistantsTabProps {
  selectedAssistant: Persona;
  availableAssistants: Persona[];
  llmProviders: LLMProviderDescriptor[];
  onSelect: (assistant: Persona) => void;
}

export function AssistantsTab({
  selectedAssistant,
  availableAssistants,
  llmProviders,
  onSelect,
}: AssistantsTabProps) {
  const [_, llmName] = getFinalLLM(llmProviders, null, null);

  return (
    <div className="py-4">
      <h3 className="px-4 text-lg font-semibold">Change Assistant</h3>
      <div className="px-2 pb-2 mx-2 max-h-[500px] overflow-y-scroll my-3 grid grid-cols-2 gap-4">
        {availableAssistants.map((assistant) => (
          <AssistantCard
            key={assistant.id}
            assistant={assistant}
            isSelected={selectedAssistant.id === assistant.id}
            onSelect={onSelect}
            llmName={llmName}
          />
        ))}
      </div>
    </div>
  );
}

const AssistantCard = ({
  assistant,
  isSelected,
  onSelect,
  llmName,
}: {
  assistant: Persona;
  isSelected: boolean;
  onSelect: (assistant: Persona) => void;
  llmName: string;
}) => {
  const nonDefaultTools = assistant.tools.filter(
    (tool) => tool.name !== "SearchTool" && tool.name !== "ImageGenerationTool"
  );

  return (
    <div
      key={assistant.id}
      className={`
      p-4 
      border 
      shadow-md 
      ${isSelected ? "border-accent" : "border-border"}
    `}
    >
      <div className="flex items-center mb-2">
        <AssistantIcon assistant={assistant} />
        <div className="ml-2 line-clamp-1 ellipsis font-bold text-sm text-emphasis">
          {assistant.name}
        </div>
        <button className="ml-auto" onClick={() => onSelect(assistant)}>
          <FiPlus />
        </button>
      </div>

      <div className="text-xs text-subtle mb-2 mt-2 line-clamp-3  h-[3rem]">
        {assistant.description}
      </div>
      <div className="mt-2 flex flex-col gap-y-1">
        {assistant.document_sets.length > 0 && (
          <div className="text-xs text-subtle flex flex-wrap gap-2">
            <p className="my-auto font-medium">Document Sets:</p>
            {assistant.document_sets.map((set) => (
              <Bubble key={set.id} isSelected={false}>
                <div className="flex flex-row gap-1">
                  <FiBookmark className="mr-1 my-auto" />
                  {set.name}
                </div>
              </Bubble>
            ))}
          </div>
        )}
        <div className="text-xs text-subtle">
          <span className="font-medium">Default:</span>{" "}
          {getDisplayNameForModel(
            assistant.llm_model_version_override || llmName
          )}
        </div>
        <AssistantTools assistant={assistant} />
      </div>
    </div>
  );
};
