import { Assistant } from "@/app/admin/assistants/interfaces";
import { CustomDropdown, DefaultDropdownElement } from "../Dropdown";
import { ChevronDown } from "lucide-react";

export function AssistantSelector({
  assistants,
  selectedAssistantId,
  onAssistantChange,
}: {
  assistants: Assistant[];
  selectedAssistantId: number;
  onAssistantChange: (assistant: Assistant) => void;
}) {
  const currentlySelectedAssistant = assistants.find(
    (assistant) => assistant.id === selectedAssistantId
  );

  return (
    <CustomDropdown
      dropdown={
        <div
          className={`
            border 
            border-border 
            bg-background
            rounded-regular 
            flex 
            flex-col 
            w-64 
            max-h-96 
            overflow-y-auto 
            overscroll-contain`}
        >
          {assistants.map((assistant, ind) => {
            const isSelected = assistant.id === selectedAssistantId;
            return (
              <DefaultDropdownElement
                key={assistant.id}
                name={assistant.name}
                onSelect={() => onAssistantChange(assistant)}
                isSelected={isSelected}
              />
            );
          })}
        </div>
      }
    >
      <div className="select-none text-sm font-bold flex  px-2 py-1.5 cursor-pointer w-fit hover:bg-hover rounded">
        {currentlySelectedAssistant?.name || "Default"}
        <ChevronDown className="my-auto ml-2" />
      </div>
    </CustomDropdown>
  );
}
