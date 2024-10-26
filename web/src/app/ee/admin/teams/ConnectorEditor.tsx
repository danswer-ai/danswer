import React from "react";
import { ConnectorIndexingStatus } from "@/lib/types";
import { Combobox } from "@/components/Combobox";

interface ConnectorEditorProps {
  allCCPairs: ConnectorIndexingStatus<any, any>[] | undefined;
  selectedCCPairIds: number[];
  setSetCCPairIds: (ccPairIds: number[]) => void;
}

export const ConnectorEditor: React.FC<ConnectorEditorProps> = ({
  allCCPairs,
  selectedCCPairIds,
  setSetCCPairIds,
}) => {
  const items = allCCPairs
    ?.filter((ccPair) => ccPair.access_type == "public")
    .map((ccPair) => ({
      value: ccPair.cc_pair_id.toString(),
      label: ccPair.name || `Connector ${ccPair.cc_pair_id}`,
    }));

  const handleSelect = (selectedValues: string[]) => {
    const selectedIds = selectedValues.map((value) => parseInt(value));
    setSetCCPairIds(selectedIds);
  };

  return (
    <div>
      <Combobox
        items={items}
        onSelect={handleSelect}
        placeholder="Select connectors"
        label="Select Connectors"
      />
    </div>
  );
};
