import React from "react";
import { Combobox } from "@/components/Combobox";
import { Assistant } from "@/app/admin/assistants/interfaces";

interface AssistantsProps {
  assistants: Assistant[];
  onSelect: (selectedValues: string[]) => void;
}

export const Assistants: React.FC<AssistantsProps> = ({
  assistants,
  onSelect,
}) => {
  const items = assistants
    .filter((assistant) => assistant.is_public)
    .map((assistant) => ({
      value: assistant.id.toString(),
      label: assistant.name,
    }));

  const handleSelect = (selectedValues: string[]) => {
    onSelect(selectedValues);
  };

  return (
    <div>
      <Combobox
        items={items}
        onSelect={handleSelect}
        placeholder="Select assistants"
        label="Select assistants"
      />
    </div>
  );
};
