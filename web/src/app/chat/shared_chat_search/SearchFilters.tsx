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

const SectionTitle = ({ children }: { children: string }) => (
  <CardHeader className="pb-2">
    <CardTitle className="text-sm font-semibold">{children}</CardTitle>
  </CardHeader>
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
    <div>
      {!filtersUntoggled && (
        <CardContent className="space-y-2">
          <div>
            <SectionTitle>Time Range</SectionTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <span>
                    {getTimeAgoString(timeRange?.from!) ||
                      "Select a time range"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
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
              <SectionTitle>Tags</SectionTitle>
              <TagFilter
                showTagsOnLeft={true}
                tags={availableTags}
                selectedTags={selectedTags}
                setSelectedTags={setSelectedTags}
              />
            </div>
          )}

          {existingSources.length > 0 && (
            <div>
              <SectionTitle>Sources</SectionTitle>

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
              <SectionTitle>Knowledge Sets</SectionTitle>
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

export function TagFilter({
  tags,
  selectedTags,
  setSelectedTags,
  showTagsOnLeft = false,
}: {
  tags: Tag[];
  selectedTags: Tag[];
  setSelectedTags: React.Dispatch<React.SetStateAction<Tag[]>>;
  showTagsOnLeft?: boolean;
}) {
  const [filterValue, setFilterValue] = useState("");
  const [tagOptionsAreVisible, setTagOptionsAreVisible] = useState(false);
  const [filteredTags, setFilteredTags] = useState<Tag[]>(tags);
  const inputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const onSelectTag = (tag: Tag) => {
    setSelectedTags((prev) => {
      if (containsObject(prev, tag)) {
        return prev.filter((t) => !objectsAreEquivalent(t, tag));
      } else {
        return [...prev, tag];
      }
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setTagOptionsAreVisible(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const debouncedFetchTags = useRef(
    debounce(async (value: string) => {
      if (value) {
        const fetchedTags = await getValidTags(value);
        setFilteredTags(fetchedTags);
      } else {
        setFilteredTags(tags);
      }
    }, 50)
  ).current;

  useEffect(() => {
    debouncedFetchTags(filterValue);

    return () => {
      debouncedFetchTags.cancel();
    };
  }, [filterValue, tags, debouncedFetchTags]);

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterValue(event.target.value);
  };

  return (
    <div className="space-y-2">
      <Input
        ref={inputRef}
        placeholder="Find a tag"
        value={filterValue}
        onChange={handleFilterChange}
        onFocus={() => setTagOptionsAreVisible(true)}
      />
      {selectedTags.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <Badge
                key={tag.tag_key + tag.tag_value}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => onSelectTag(tag)}
              >
                {tag.tag_key}={tag.tag_value}
                <FiX className="ml-1 h-3 w-3" />
              </Badge>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTags([])}
            className="text-xs"
          >
            Clear all
          </Button>
        </div>
      )}
      {tagOptionsAreVisible && (
        <Popover>
          <PopoverContent
            className="w-72"
            align={showTagsOnLeft ? "start" : "end"}
          >
            <div ref={popupRef}>
              <div className="flex items-center border-b pb-2 mb-2">
                <FiTag className="mr-2" />
                <span className="font-medium text-sm">Tags</span>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-1">
                {filteredTags.length > 0 ? (
                  filteredTags.map((tag) => (
                    <div
                      key={tag.tag_key + tag.tag_value}
                      onClick={() => onSelectTag(tag)}
                      className={`
                        text-sm 
                        cursor-pointer 
                        p-2 
                        rounded-md
                        ${
                          selectedTags.includes(tag)
                            ? "bg-accent"
                            : "hover:bg-accent"
                        }
                      `}
                    >
                      {tag.tag_key}={tag.tag_value}
                    </div>
                  ))
                ) : (
                  <div className="text-sm p-2">No matching tags found</div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
