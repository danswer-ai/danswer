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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Persona } from "@/app/admin/assistants/interfaces";
import { LLMProviderDescriptor } from "@/app/admin/models/llm/interfaces";
import { AssistantTools } from "@/app/assistants/ToolsDisplay";
import { Bubble } from "@/components/Bubble";
import { AssistantIcon } from "@/components/assistants/AssistantIcon";
import { getDisplayNameForModel } from "@/lib/hooks";
import { getFinalLLM } from "@/lib/llm/utils";
import React, { useState } from "react";
import { FiBookmark, FiPlus } from "react-icons/fi";
import { updateUserAssistantList } from "@/lib/assistants/updateAssistantPreferences";

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
  const [hovering, setHovering] = useState(false);
  return (
    <div
      onClick={() => onSelect(assistant)}
      className={`
      p-4 
      cursor-pointer
      border 
      hover:bg-hover
      shadow-md 
      rounded
      rounded-lg
      border-border
    `}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="flex items-center mb-2">
        <AssistantIcon assistant={assistant} />
        <div className="ml-2 line-clamp-1 ellipsis font-bold text-sm text-emphasis">
          {assistant.name}
        </div>
      </div>

      <div className="text-xs text-subtle mb-2 mt-2 line-clamp-3 py-1">
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
  );
};

function DraggableAssistantCard(props: {
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
  } = useSortable({ id: props.assistant.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <AssistantCard {...props} />
    </div>
  );
}

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
  const [assistants, setAssistants] = useState(availableAssistants);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setAssistants((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const updatedAssistants = arrayMove(items, oldIndex, newIndex);

        updateUserAssistantList(updatedAssistants.map((a) => a.id));

        return updatedAssistants;
      });
    }
  }

  return (
    <div className="py-4">
      <h3 className="px-4 text-lg font-semibold">Change Assistant</h3>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={assistants.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="px-2 pb-2 mx-2 max-h-[500px] miniscroll overflow-y-scroll my-3 grid grid-cols-1 gap-4">
            {assistants.map((assistant) => (
              <DraggableAssistantCard
                key={assistant.id}
                assistant={assistant}
                isSelected={selectedAssistant.id === assistant.id}
                onSelect={onSelect}
                llmName={llmName}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
