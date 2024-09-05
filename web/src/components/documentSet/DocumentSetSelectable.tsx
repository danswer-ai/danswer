import { DocumentSet, ValidSources } from "@/lib/types";
import { SourceIcon } from "../SourceIcon";
import { Checkbox } from "../ui/checkbox";

export function DocumentSetSelectable({
  documentSet,
  isSelected,
  onSelect,
}: {
  documentSet: DocumentSet;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const uniqueSources = new Set<ValidSources>();
  documentSet.cc_pair_descriptors.forEach((ccPairDescriptor) => {
    uniqueSources.add(ccPairDescriptor.connector.source);
  });

  // Only trigger onSelect when necessary
  const handleClick = () => {
    if (!isSelected) {
      onSelect(); // Call only when not selected
    }
  };

  return (
    <div
      key={documentSet.id}
      className={
        `p-4 w-72 rounded-regular border border-border flex justify-between gap-3 cursor-pointer ` +
        (isSelected ? " bg-hover" : " bg-background hover:bg-hover-light")
      }
      onClick={handleClick} // Changed this part
    >
      <div className="flex gap-3">
        <div className="pt-0.5">
          {Array.from(uniqueSources).map((source) => (
            <SourceIcon key={source} sourceType={source} iconSize={16} />
          ))}
        </div>
        <div className="flex flex-col h-full">
          <div className="font-bold text-dark-900">{documentSet.name}</div>
          <div className="text-sm pt-1">{documentSet.description}</div>
        </div>
      </div>
      <Checkbox
        checked={isSelected}
        onChange={() => null} // Ensure this is controlled externally
      />
    </div>
  );
}
