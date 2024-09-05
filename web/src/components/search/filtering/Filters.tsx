import React from "react";
import { DocumentSet, Tag, ValidSources } from "@/lib/types";
import { SourceMetadata } from "@/lib/search/interfaces";
import { InfoIcon, defaultTailwindCSS } from "../../icons/icons";
import { HoverPopup } from "../../HoverPopup";
import { FiBook, FiBookmark, FiMap, FiX } from "react-icons/fi";
import { DateRangePickerValue } from "@tremor/react";
import { FilterDropdown } from "./FilterDropdown";
import { listSourceMetadata } from "@/lib/sources";
import { SourceIcon } from "@/components/SourceIcon";
import { TagFilter } from "./TagFilter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomSelect } from "@/components/Select";
import { Checkbox } from "@/components/ui/checkbox";
import { Brain } from "lucide-react";
import { CustomTooltip } from "@/components/CustomTooltip";
import { SortSearch } from "../SortSearch";
import { DateRangeSearchSelector } from "../DateRangeSearchSelector";

const SectionTitle = ({ children }: { children: string }) => (
  <div className="flex px-2 py-3 text-sm font-bold">{children}</div>
);

export interface SourceSelectorProps {
  timeRange: DateRangePickerValue | null;
  setTimeRange: React.Dispatch<
    React.SetStateAction<DateRangePickerValue | null>
  >;
  selectedSources: SourceMetadata[];
  setSelectedSources: React.Dispatch<React.SetStateAction<SourceMetadata[]>>;
  selectedDocumentSets: string[];
  setSelectedDocumentSets: React.Dispatch<React.SetStateAction<string[]>>;
  selectedTags: Tag[];
  setSelectedTags: React.Dispatch<React.SetStateAction<Tag[]>>;
  availableDocumentSets: DocumentSet[];
  existingSources: ValidSources[];
  availableTags: Tag[];
}

export function SourceSelector({
  timeRange,
  setTimeRange,
  selectedSources,
  setSelectedSources,
  selectedDocumentSets,
  setSelectedDocumentSets,
  selectedTags,
  setSelectedTags,
  availableDocumentSets,
  existingSources,
  availableTags,
}: SourceSelectorProps) {
  const handleSelect = (source: SourceMetadata) => {
    setSelectedSources((prev: SourceMetadata[]) => {
      if (
        prev.map((source) => source.internalName).includes(source.internalName)
      ) {
        return prev.filter((s) => s.internalName !== source.internalName);
      } else {
        return [...prev, source];
      }
    });
  };

  const handleDocumentSetSelect = (documentSetName: string) => {
    setSelectedDocumentSets((prev: string[]) => {
      if (prev.includes(documentSetName)) {
        return prev.filter((s) => s !== documentSetName);
      } else {
        return [...prev, documentSetName];
      }
    });
  };

  return (
    <div className="w-full flex flex-col lg:gap-4 text-dark-900">
      <div className="lg:hidden">
        <SortSearch isMobile />

        <DateRangeSearchSelector
          isMobile
          value={timeRange}
          onValueChange={setTimeRange}
        />
      </div>

      {existingSources.length > 0 && (
        <div className="lg:border rounded-[8px] w-full px-2.5">
          <SectionTitle>Sources</SectionTitle>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-0">
            {listSourceMetadata()
              .filter((source) => existingSources.includes(source.internalName))
              .map((source, index, array) => (
                <div
                  key={source.internalName}
                  className={`w-full flex items-center justify-between cursor-pointer px-2 py-3 gap-2 ${
                    index === 0 ? "lg:border-t" : ""
                  } ${index !== array.length - 1 ? "lg:border-b" : ""}`}
                  onClick={() => handleSelect(source)}
                >
                  <label
                    htmlFor={source.internalName}
                    className="flex items-center w-full"
                  >
                    <SourceIcon
                      sourceType={source.internalName}
                      iconSize={18}
                    />
                    <span className="ml-3 text-sm">{source.displayName}</span>
                  </label>
                  <Checkbox id={source.internalName} />
                </div>
              ))}
          </div>
        </div>
      )}

      {availableDocumentSets.length > 0 && (
        <div className="lg:border rounded-[8px] w-full px-2.5">
          <SectionTitle>Knowledge Sets</SectionTitle>
          <div>
            {availableDocumentSets.map((documentSet) => (
              <div
                key={documentSet.name}
                className={`w-full flex items-center justify-between cursor-pointer px-2 py-3 gap-2 border-t`}
              >
                <label
                  htmlFor={documentSet.name}
                  className="flex items-center w-full"
                  onClick={() => handleDocumentSetSelect(documentSet.name)}
                >
                  <CustomTooltip
                    trigger={
                      <div className="flex my-auto mr-3">
                        <Brain size={18} />
                      </div>
                    }
                  >
                    <div className="text-sm">
                      <div className="flex font-medium">Description</div>
                      <div className="mt-1">{documentSet.description}</div>
                    </div>
                  </CustomTooltip>
                  <span className="text-sm">{documentSet.name}</span>
                </label>
                <Checkbox id={documentSet.name} />
              </div>
            ))}
          </div>
        </div>
      )}

      {availableTags.length > 0 && (
        <div className="p-4 lg:p-0">
          <TagFilter
            tags={availableTags}
            selectedTags={selectedTags}
            setSelectedTags={setSelectedTags}
          />
        </div>
      )}
    </div>
  );
}

function SelectedBubble({
  children,
  onClick,
}: {
  children: string | JSX.Element;
  onClick: () => void;
}) {
  return (
    <div
      className={
        "flex cursor-pointer items-center border border-border " +
        "py-1 my-1.5 rounded-regular px-2 w-fit hover:bg-hover"
      }
      onClick={onClick}
    >
      {children}
      <FiX className="ml-2" size={14} />
    </div>
  );
}

export function HorizontalFilters({
  timeRange,
  setTimeRange,
  selectedSources,
  setSelectedSources,
  selectedDocumentSets,
  setSelectedDocumentSets,
  availableDocumentSets,
  existingSources,
}: SourceSelectorProps) {
  const handleSourceSelect = (source: SourceMetadata) => {
    setSelectedSources((prev: SourceMetadata[]) => {
      const prevSourceNames = prev.map((source) => source.internalName);
      if (prevSourceNames.includes(source.internalName)) {
        return prev.filter((s) => s.internalName !== source.internalName);
      } else {
        return [...prev, source];
      }
    });
  };

  const handleDocumentSetSelect = (documentSetName: string) => {
    setSelectedDocumentSets((prev: string[]) => {
      if (prev.includes(documentSetName)) {
        return prev.filter((s) => s !== documentSetName);
      } else {
        return [...prev, documentSetName];
      }
    });
  };

  const allSources = listSourceMetadata();
  const availableSources = allSources.filter((source) =>
    existingSources.includes(source.internalName)
  );

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="w-64">
          <DateRangeSearchSelector
            value={timeRange}
            onValueChange={setTimeRange}
          />
        </div>

        <Select
          onValueChange={(value) => {
            const selectedSource = allSources.find(
              (source) => source.displayName === value
            );
            if (selectedSource) handleSourceSelect(selectedSource);
          }}
        >
          <SelectTrigger className="w-64">
            <div className="flex items-center gap-3">
              <FiMap size={16} />
              <SelectValue placeholder="All Sources" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {availableSources.map((source) => (
              <SelectItem key={source.displayName} value={source.displayName}>
                <div className="flex items-center">
                  <SourceIcon sourceType={source.internalName} iconSize={16} />
                  <span className="ml-2 text-sm">{source.displayName}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          onValueChange={(value) => handleDocumentSetSelect(value)}
          defaultValue=""
        >
          <SelectTrigger className="w-64">
            <div className="flex items-center gap-3">
              <FiBook size={16} />
              <SelectValue placeholder="All Document Sets" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {availableDocumentSets.map((documentSet) => (
              <SelectItem key={documentSet.name} value={documentSet.name}>
                <div className="flex items-center gap-2">
                  <FiBookmark /> {documentSet.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex h-12 pb-4 mt-2">
        <div className="flex flex-wrap gap-x-2">
          {timeRange && timeRange.selectValue && (
            <SelectedBubble onClick={() => setTimeRange(null)}>
              <div className="flex text-sm">{timeRange.selectValue}</div>
            </SelectedBubble>
          )}
          {existingSources.length > 0 &&
            selectedSources.map((source) => (
              <SelectedBubble
                key={source.internalName}
                onClick={() => handleSourceSelect(source)}
              >
                <>
                  <SourceIcon sourceType={source.internalName} iconSize={16} />
                  <span className="ml-2 text-sm">{source.displayName}</span>
                </>
              </SelectedBubble>
            ))}
          {selectedDocumentSets.length > 0 &&
            selectedDocumentSets.map((documentSetName) => (
              <SelectedBubble
                key={documentSetName}
                onClick={() => handleDocumentSetSelect(documentSetName)}
              >
                <>
                  <div>
                    <FiBookmark />
                  </div>
                  <span className="ml-2 text-sm">{documentSetName}</span>
                </>
              </SelectedBubble>
            ))}
        </div>
      </div>
    </div>
  );
}
