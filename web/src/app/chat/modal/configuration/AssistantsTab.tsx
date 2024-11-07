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
import { Assistant } from "@/app/admin/assistants/interfaces";
import { LLMProviderDescriptor } from "@/app/admin/configuration/llm/interfaces";
import { getFinalLLM } from "@/lib/llm/utils";
import React, { useState } from "react";
import { updateUserAssistantList } from "@/lib/assistants/updateAssistantPreferences";
import { DraggableAssistantCard } from "@/components/assistants/AssistantCards";
import { useUser } from "@/components/user/UserProvider";
import { useAssistants } from "@/context/AssistantsContext";

export function AssistantsTab({
  selectedAssistant,
  llmProviders,
  onSelect,
}: {
  selectedAssistant: Assistant;
  llmProviders: LLMProviderDescriptor[];
  onSelect: (assistant: Assistant) => void;
}) {
  const { refreshUser } = useUser();
  const [_, llmName] = getFinalLLM(llmProviders, null, null);
  // TODO Final assitant tandaan mo
  const { assistants, refreshAssistants } = useAssistants();
  const [assistant, setAssistants] = useState(assistants);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = assistant.findIndex(
        (item) => item.id.toString() === active.id
      );
      const newIndex = assistant.findIndex(
        (item) => item.id.toString() === over.id
      );
      const updatedAssistants = arrayMove(assistant, oldIndex, newIndex);

      setAssistants(updatedAssistants);
      await updateUserAssistantList(updatedAssistants.map((a) => a.id));
      await refreshUser();
      await refreshAssistants();
    }
  }

  console.log(assistant)

  return (
    <div className="py-4 w-full overflow-y-auto">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={assistant.map((a) => a.id.toString())}
          strategy={verticalListSortingStrategy}
        >
          <div className="px-4 pb-2  max-h-[500px] my-3 grid grid-cols-1 gap-4">
            {assistant.map((assistant) => (
              <DraggableAssistantCard
                key={assistant.id.toString()}
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
