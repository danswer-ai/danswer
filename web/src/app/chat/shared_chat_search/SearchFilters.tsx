import { containsObject, objectsAreEquivalent } from "@/lib/contains";
import { useEffect, useRef, useState } from "react";
import debounce from "lodash/debounce";
import { getValidTags } from "@/lib/tags/tagUtils";
import { DocumentSet, Tag, ValidSources } from "@/lib/types";
import { SourceMetadata } from "@/lib/search/interfaces";
import { InfoIcon, defaultTailwindCSS } from "@/components/icons/icons";
import { HoverPopup } from "@/components/HoverPopup";
import { FiFilter, FiTag, FiX } from "react-icons/fi";
import { DateRangePickerValue } from "@/app/ee/admin/performance/DateRangeSelector";
import { listSourceMetadata } from "@/lib/sources";
import { SourceIcon } from "@/components/SourceIcon";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { getTimeAgoString } from "@/lib/dateUtils";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Divide } from "lucide-react";
import { TagFilter } from "@/components/search/filtering/TagFilter";

const SectionTitle = ({
  children,
  modal,
}: {
  children: string;
  modal?: boolean;
}) => (
  <div className={`mt-4 pb-2 ${modal ? "w-[80vw]" : "w-full"}`}>
    <p className="text-sm font-semibold">{children}</p>
  </div>
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
  toggleFilters: () => void;
  filtersUntoggled: boolean;
  tagsOnLeft: boolean;
  modal?: boolean;
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
  toggleFilters,
  filtersUntoggled,
  tagsOnLeft,
  modal,
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

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const calendar = document.querySelector(".rdp");
      if (calendar && !calendar.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div>
      {!filtersUntoggled && (
        <CardContent className="overflow-x-hidden space-y-2">
          <div>
            <div className="flex  py-2  mt-2  justify-start gap-x-2 items-center">
              <p className="text-sm font-semibold">Time Range</p>
              {timeRange && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setTimeRange(null);
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              )}
            </div>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`${
                    modal ? "w-[80vw]" : "w-full"
                  } justify-start text-left font-normal`}
                >
                  <span>
                    {getTimeAgoString(timeRange?.from!) ||
                      "Select a time range"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="z-[10000] w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={
                    timeRange
                      ? {
                          from: new Date(timeRange.from),
                          to: new Date(timeRange.to),
                        }
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
                  className="rounded-md"
                />
              </PopoverContent>
            </Popover>
          </div>

          {availableTags.length > 0 && (
            <div>
              <SectionTitle modal={modal}>Tags</SectionTitle>
              <TagFilter
                modal={modal}
                showTagsOnLeft={true}
                tags={availableTags}
                selectedTags={selectedTags}
                setSelectedTags={setSelectedTags}
              />
            </div>
          )}

          {existingSources.length > 0 && (
            <div>
              <SectionTitle modal={modal}>Sources</SectionTitle>

              <div className="space-y-0">
                <div className="flex items-center space-x-2 cursor-pointer hover:bg-background-200 rounded-md p-2">
                  <Checkbox
                    id="select-all-sources"
                    checked={allSourcesSelected}
                    onCheckedChange={toggleAllSources}
                  />
                  <label
                    htmlFor="select-all-sources"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Select All
                  </label>
                </div>
                {listSourceMetadata()
                  .filter((source) =>
                    existingSources.includes(source.internalName)
                  )
                  .map((source) => (
                    <div
                      key={source.internalName}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-background-200 rounded-md p-2"
                      onClick={() => handleSelect(source)}
                    >
                      <Checkbox
                        checked={selectedSources
                          .map((s) => s.internalName)
                          .includes(source.internalName)}
                        onCheckedChange={() => handleSelect(source)}
                      />
                      <SourceIcon
                        sourceType={source.internalName}
                        iconSize={16}
                      />
                      <span className="text-sm">{source.displayName}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {availableDocumentSets.length > 0 && (
            <div>
              <SectionTitle modal={modal}>Knowledge Sets</SectionTitle>
              <div className="space-y-2">
                {availableDocumentSets.map((documentSet) => (
                  <div
                    key={documentSet.name}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-accent rounded-md p-2"
                    onClick={() => handleDocumentSetSelect(documentSet.name)}
                  >
                    <Checkbox
                      checked={selectedDocumentSets.includes(documentSet.name)}
                      onCheckedChange={() =>
                        handleDocumentSetSelect(documentSet.name)
                      }
                    />
                    <HoverPopup
                      mainContent={
                        <InfoIcon className={`${defaultTailwindCSS} h-4 w-4`} />
                      }
                      popupContent={
                        <div className="text-sm w-64">
                          <div className="font-medium">Description</div>
                          <div className="mt-1">{documentSet.description}</div>
                        </div>
                      }
                    />
                    <span className="text-sm">{documentSet.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </div>
  );
}
