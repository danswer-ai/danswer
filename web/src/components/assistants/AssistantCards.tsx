import { CSS } from "@dnd-kit/utilities";

import { Persona } from "@/app/admin/assistants/interfaces";
import { AssistantTools } from "@/app/assistants/ToolsDisplay";
import { Bubble } from "@/components/Bubble";
import { AssistantIcon } from "@/components/assistants/AssistantIcon";
import { getDisplayNameForModel } from "@/lib/hooks";
import { useSortable } from "@dnd-kit/sortable";
import React, { useState } from "react";
import { FiBookmark } from "react-icons/fi";
import { MdDragIndicator } from "react-icons/md";

export const AssistantCard = ({
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
  const [hovering, setHovering] = useState(false);
  return (
    <div
      onClick={() => onSelect(assistant)}
      className={`
        p-4
        cursor-pointer
        border 
        ${isSelected ? "bg-hover" : "hover:bg-hover-light"}
        shadow-md 
        rounded-lg
        border-border
        grow
        flex items-center
        overflow-hidden 
      `}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="w-full">
        <div className="flex items-center mb-2">
          <AssistantIcon assistant={assistant} />
          <div className="ml-2 ellipsis truncate font-bold text-sm text-emphasis">
            {assistant.name}
          </div>
        </div>

        <div className="text-xs text-wrap text-subtle mb-2 mt-2 line-clamp-3 py-1">
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
            <span className="font-semibold">Default model:</span>{" "}
            {getDisplayNameForModel(
              assistant.llm_model_version_override || llmName
            )}
          </div>
          <AssistantTools hovered={hovering} assistant={assistant} />
        </div>
      </div>
    </div>
  );
};

export function DraggableAssistantCard(props: {
  assistant: Persona;
  isSelected: boolean;
  onSelect: (assistant: Persona) => void;
  llmName: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.assistant.id.toString() });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
    opacity: isDragging ? 0.9 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="overlow-y-scroll inputscroll flex items-center"
    >
      <div {...attributes} {...listeners} className="mr-1 cursor-grab">
        <MdDragIndicator className="h-3 w-3 flex-none" />
      </div>

      <AssistantCard {...props} />
    </div>
  );
}

export function DisplayAssistantCard({
  selectedPersona,
}: {
  selectedPersona: Persona;
}) {
  return (
    <div className="p-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-md border border-border/50 max-w-md w-full mx-auto transition-all duration-300 ease-in-out hover:shadow-lg">
      <div className="flex items-center mb-3">
        <AssistantIcon
          disableToolip
          size="medium"
          assistant={selectedPersona}
        />
        <h2 className="ml-3 text-xl font-semibold text-text-900">
          {selectedPersona.name}
        </h2>
      </div>
      <p className="text-sm text-text-600 mb-3 leading-relaxed">
        {selectedPersona.description}
      </p>
      {selectedPersona.tools.length > 0 ||
      selectedPersona.llm_relevance_filter ||
      selectedPersona.llm_filter_extraction ? (
        <div className="space-y-2">
          <h3 className="text-base font-medium text-text-900">Capabilities:</h3>
          <ul className="space-y-.5">
            {/* display all tools */}
            {selectedPersona.tools.map((tool, index) => (
              <li
                key={index}
                className="flex items-center text-sm text-text-700"
              >
                <span className="mr-2 text-text-500 opacity-70">•</span>{" "}
                {tool.display_name}
              </li>
            ))}
            {/* Built in capabilities */}
            {selectedPersona.llm_relevance_filter && (
              <li className="flex items-center text-sm text-text-700">
                <span className="mr-2 text-text-500 opacity-70">•</span>{" "}
                Advanced Relevance Filtering
              </li>
            )}
            {selectedPersona.llm_filter_extraction && (
              <li className="flex items-center text-sm text-text-700">
                <span className="mr-2 text-text-500 opacity-70">•</span> Smart
                Information Extraction
              </li>
            )}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-text-600 italic">
          No specific capabilities listed for this assistant.
        </p>
      )}
    </div>
  );
}
