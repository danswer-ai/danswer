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

  const handleCheckboxChange = (checked: boolean | "indeterminate") => {
    if (typeof checked === "boolean") {
      onSelect();
    }
  };

  return (
    <label
      className={
        `p-4 w-72 rounded-regular border border-border flex justify-between gap-3 cursor-pointer ` +
        (isSelected ? " bg-hover" : " bg-background hover:bg-hover-light")
      }
    >
      <div className="flex gap-3 w-4/5">
        <div className="pt-0.5 space-y-2">
          {Array.from(uniqueSources).map((source) => (
            <SourceIcon key={source} sourceType={source} iconSize={16} />
          ))}
        </div>
        <div className="flex flex-col h-full truncate w-full">
          <div className="font-bold text-dark-900 truncate">
            {documentSet.name}
          </div>
          <div className="text-sm pt-1 truncate">{documentSet.description}</div>
        </div>
      </div>
      <Checkbox checked={isSelected} onCheckedChange={handleCheckboxChange} />
    </label>
  );
}
