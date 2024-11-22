import React, { useState } from "react";
import { DocumentSet, Tag, ValidSources } from "@/lib/types";
import { SourceMetadata } from "@/lib/search/interfaces";
import {
  GearIcon,
  InfoIcon,
  MinusIcon,
  PlusCircleIcon,
  PlusIcon,
  defaultTailwindCSS,
} from "@/components/icons/icons";
import { HoverPopup } from "@/components/HoverPopup";
import {
  FiBook,
  FiBookmark,
  FiFilter,
  FiMap,
  FiTag,
  FiX,
} from "react-icons/fi";
import { DateRangePickerValue } from "@/app/ee/admin/performance/DateRangeSelector";
import { listSourceMetadata } from "@/lib/sources";
import { SourceIcon } from "@/components/SourceIcon";
import { TagFilter } from "@/components/search/filtering/TagFilter";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { PopoverContent } from "@radix-ui/react-popover";
import { CalendarIcon } from "lucide-react";
import { buildDateString, getTimeAgoString } from "@/lib/dateUtils";

const SectionTitle = ({ children }: { children: string }) => (
  <div className="font-bold text-xs mt-2 flex">{children}</div>
);

export interface SourceSelectorProps {
  timeRange: DateRangePickerValue | null;
  setTimeRange: React.Dispatch<
    React.SetStateAction<DateRangePickerValue | null>
  >;
  showDocSidebar?: boolean;
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
  showDocSidebar,
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

  let allSourcesSelected = selectedSources.length > 0;

  const toggleAllSources = () => {
    if (allSourcesSelected) {
      setSelectedSources([]);
    } else {
      const allSources = listSourceMetadata().filter((source) =>
        existingSources.includes(source.internalName)
      );
      setSelectedSources(allSources);
    }
  };

  return (
    <div
      className={`hidden ${
        showDocSidebar ? "4xl:block" : "!block"
      } duration-1000 flex ease-out transition-all transform origin-top-right`}
    >
      <div className="mb-4 pb-2 flex border-b border-border text-emphasis">
        <FiFilter className="my-auto ml-2" size="16" />
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <div className="cursor-pointer">
            <SectionTitle>Time Range</SectionTitle>
            <p className="text-sm text-default mt-2">
              {getTimeAgoString(timeRange?.from!) || "Select a time range"}
            </p>
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="bg-background-search-filter border-border border rounded-md z-[200] p-0"
          align="start"
        >
          <Calendar
            mode="range"
            selected={
              timeRange
                ? { from: new Date(timeRange.from), to: new Date(timeRange.to) }
                : undefined
            }
            onSelect={(daterange) => {
              const initialDate = daterange?.from || new Date();
              const endDate = daterange?.to || new Date();
              setTimeRange({
                from: initialDate,
                to: endDate,
                selectValue: timeRange?.selectValue || "",
              });
            }}
            className="rounded-md "
          />
        </PopoverContent>
      </Popover>

      {availableTags.length > 0 && (
        <>
          <div className="mt-4 mb-2">
            <SectionTitle>Tags</SectionTitle>
          </div>
          <TagFilter
            tags={availableTags}
            selectedTags={selectedTags}
            setSelectedTags={setSelectedTags}
          />
        </>
      )}

      {existingSources.length > 0 && (
        <div className="mt-4">
          <div className="flex w-full gap-x-2 items-center">
            <div className="font-bold text-xs mt-2 flex items-center gap-x-2">
              <p>Sources</p>
              <input
                type="checkbox"
                checked={allSourcesSelected}
                onChange={toggleAllSources}
                className="my-auto form-checkbox h-3 w-3 text-primary border-background-900 rounded"
              />
            </div>
          </div>
          <div className="px-1">
            {listSourceMetadata()
              .filter((source) => existingSources.includes(source.internalName))
              .map((source) => (
                <div
                  key={source.internalName}
                  className={
                    "flex cursor-pointer w-full items-center " +
                    "py-1.5 my-1.5 rounded-lg px-2 select-none " +
                    (selectedSources
                      .map((source) => source.internalName)
                      .includes(source.internalName)
                      ? "bg-hover"
                      : "hover:bg-hover-light")
                  }
                  onClick={() => handleSelect(source)}
                >
                  <SourceIcon sourceType={source.internalName} iconSize={16} />
                  <span className="ml-2 text-sm text-default">
                    {source.displayName}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {availableDocumentSets.length > 0 && (
        <>
          <div className="mt-4">
            <SectionTitle>Knowledge Sets</SectionTitle>
          </div>
          <div className="px-1">
            {availableDocumentSets.map((documentSet) => (
              <div key={documentSet.name} className="my-1.5 flex">
                <div
                  key={documentSet.name}
                  className={
                    "flex cursor-pointer w-full items-center " +
                    "py-1.5 rounded-lg px-2 " +
                    (selectedDocumentSets.includes(documentSet.name)
                      ? "bg-hover"
                      : "hover:bg-hover-light")
                  }
                  onClick={() => handleDocumentSetSelect(documentSet.name)}
                >
                  <HoverPopup
                    mainContent={
                      <div className="flex my-auto mr-2">
                        <InfoIcon className={defaultTailwindCSS} />
                      </div>
                    }
                    popupContent={
                      <div className="text-sm w-64">
                        <div className="flex font-medium">Description</div>
                        <div className="mt-1">{documentSet.description}</div>
                      </div>
                    }
                    classNameModifications="-ml-2"
                  />
                  <span className="text-sm">{documentSet.name}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
