import { BasicClickable } from "@/components/BasicClickable";
import { ControlledPopup, DefaultDropdownElement } from "@/components/Dropdown";
import { Cpu, Search } from "lucide-react";
import { useState } from "react";

export const QA = "Question Answering";
export const SEARCH = "Search Only";

function SearchTypeSelectorContent({
  selectedSearchType,
  setSelectedSearchType,
}: {
  selectedSearchType: string;
  setSelectedSearchType: React.Dispatch<React.SetStateAction<string>>;
}) {
  return (
    <div className="w-56">
      <DefaultDropdownElement
        key={QA}
        name={QA}
        icon={<Cpu size={16} />}
        onSelect={() => setSelectedSearchType(QA)}
        isSelected={selectedSearchType === QA}
      />
      <DefaultDropdownElement
        key={SEARCH}
        name={SEARCH}
        icon={<Search size={16} />}
        onSelect={() => setSelectedSearchType(SEARCH)}
        isSelected={selectedSearchType === SEARCH}
      />
    </div>
  );
}

export function SearchTypeSelector({
  selectedSearchType,
  setSelectedSearchType,
}: {
  selectedSearchType: string;
  setSelectedSearchType: React.Dispatch<React.SetStateAction<string>>;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ControlledPopup
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      popupContent={
        <SearchTypeSelectorContent
          selectedSearchType={selectedSearchType}
          setSelectedSearchType={setSelectedSearchType}
        />
      }
    >
      <BasicClickable onClick={() => setIsOpen(!isOpen)}>
        <div className="flex text-xs">
          {selectedSearchType === QA ? (
            <>
              <Cpu className="my-auto mr-1" size={16} /> QA
            </>
          ) : (
            <>
              <Search className="my-auto mr-1" size={16} /> Search
            </>
          )}
        </div>
      </BasicClickable>
    </ControlledPopup>
  );
}
