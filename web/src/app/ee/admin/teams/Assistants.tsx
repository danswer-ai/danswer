/* import React from "react";
import { Combobox } from "@/components/Combobox";
import { Assistant } from "@/app/admin/assistants/interfaces";

interface AssistantsProps {
  assistants: Assistant[];
  setSelectedAssistantIds: (ids: number[]) => void;
}

export const Assistants: React.FC<AssistantsProps> = ({
  assistants,
  setSelectedAssistantIds,
}) => {
  const items = assistants.map((assistant) => ({
    value: assistant.id.toString(),
    label: assistant.name,
  }));

  const handleSelect = (selectedValues: string[]) => {
    const selectedIds = selectedValues.map((value) => parseInt(value));
    setSelectedAssistantIds(selectedIds);
  };

  return (
    <div>
      <Combobox
        items={items}
        onSelect={handleSelect}
        placeholder="Select document sets"
        label="Select document sets"
      />
    </div>
  );
}; */
import React from "react";
import { Combobox } from "@/components/Combobox";
import { Assistant } from "@/app/admin/assistants/interfaces";

interface AssistantsProps {
  assistants: Assistant[]; // Accept assistants as a prop
  onSelect: (selectedValues: string[]) => void; // Accept an onSelect prop
}

export const Assistants: React.FC<AssistantsProps> = ({
  assistants,
  onSelect,
}) => {
  // Map the assistants to the expected structure
  const items = assistants.map((assistant) => ({
    value: assistant.id.toString(), // Ensure value is a string
    label: assistant.name,
  }));

  const handleSelect = (selectedValues: string[]) => {
    onSelect(selectedValues); // Call the onSelect prop with selected values
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
