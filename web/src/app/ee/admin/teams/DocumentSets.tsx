import React from "react";
import { DocumentSet } from "@/lib/types";
import { Combobox } from "@/components/Combobox";

interface DocumentSetsProps {
  documentSets: DocumentSet[] | undefined;
  setSelectedDocumentSetIds: (ids: number[]) => void;
}

export const DocumentSets: React.FC<DocumentSetsProps> = ({
  documentSets = [],
  setSelectedDocumentSetIds,
}) => {
  const items = documentSets
    .filter((docSet) => docSet.is_public)
    .map((docSet) => ({
      value: docSet.id.toString(),
      label: docSet.name,
    }));

  const handleSelect = (selectedValues: string[]) => {
    const selectedIds = selectedValues.map((value) => parseInt(value));
    setSelectedDocumentSetIds(selectedIds);
  };

  return (
    <div>
      <Combobox
        items={items}
        onSelect={handleSelect}
        placeholder="Select document sets"
        label="Select document sets"
        isOnModal
      />
    </div>
  );
};
