import { SourceIcon } from "@/components/SourceIcon";
import React from "react";
import { FilterManager } from "@/lib/hooks";
import { DateRangePickerValue } from "@tremor/react";
import { X, Tag, Bookmark } from "lucide-react";
import { DateRange } from "react-day-picker";

const displayTimeRange = (timeRange: DateRange | null) => {
  if (!timeRange) {
    return "No date range selected";
  }

  const today = new Date();
  const isToday =
    timeRange.from?.toLocaleDateString() === today.toLocaleDateString() &&
    timeRange.to?.toLocaleDateString() === today.toLocaleDateString();

  if (isToday) {
    return `Today: ${timeRange.from!.toLocaleDateString()}`;
  }

  if (timeRange.from && timeRange.to) {
    return `${timeRange.from.toLocaleDateString()} to ${timeRange.to.toLocaleDateString()}`;
  } else if (timeRange.from) {
    return `${timeRange.from.toLocaleDateString()}`;
  } else if (timeRange.to) {
    return `${timeRange.to.toLocaleDateString()}`;
  } else {
    return "No date range selected";
  }
};

const SelectedFilter = ({
  onClick,
  children,
}: {
  onClick: () => void;
  children: JSX.Element | string;
}) => (
  <div
    className="
      flex 
      text-xs 
      cursor-pointer 
      items-center 
      border 
      border-border 
      py-1 
      rounded-regular 
      px-2 
      w-fit 
      select-none 
      hover:bg-hover 
      bg-background 
      shadow-md 
    "
    onClick={onClick}
  >
    {children}
    <X className="ml-2" size={14} />
  </div>
);

export function SelectedFilterDisplay({
  filterManager,
}: {
  filterManager: FilterManager;
}) {
  const {
    timeRange,
    setTimeRange,
    selectedSources,
    setSelectedSources,
    selectedDocumentSets,
    setSelectedDocumentSets,
    selectedTags,
    setSelectedTags,
  } = filterManager;

  const anyFilters =
    timeRange !== null ||
    selectedSources.length > 0 ||
    selectedDocumentSets.length > 0 ||
    selectedTags.length > 0;

  if (!anyFilters) {
    return null;
  }

  return (
    <div className="flex mb-2">
      <div className="flex flex-wrap gap-x-2">
        {timeRange && (
          <SelectedFilter onClick={() => setTimeRange(null)}>
            <div className="flex">{displayTimeRange(timeRange)}</div>
          </SelectedFilter>
        )}
        {selectedSources.map((source) => (
          <SelectedFilter
            key={source.internalName}
            onClick={() =>
              setSelectedSources((prevSources) =>
                prevSources.filter(
                  (s) => s.internalName !== source.internalName
                )
              )
            }
          >
            <>
              <SourceIcon sourceType={source.internalName} iconSize={16} />
              <span className="ml-2">{source.displayName}</span>
            </>
          </SelectedFilter>
        ))}
        {selectedDocumentSets.length > 0 &&
          selectedDocumentSets.map((documentSetName) => (
            <SelectedFilter
              key={documentSetName}
              onClick={() =>
                setSelectedDocumentSets((prevSets) =>
                  prevSets.filter((s) => s !== documentSetName)
                )
              }
            >
              <>
                <div>
                  <Bookmark size={14} />
                </div>
                <span className="ml-2">{documentSetName}</span>
              </>
            </SelectedFilter>
          ))}
        {selectedTags.length > 0 &&
          selectedTags.map((tag) => (
            <SelectedFilter
              key={tag.tag_key + tag.tag_value}
              onClick={() =>
                setSelectedTags((prevTags) =>
                  prevTags.filter(
                    (t) =>
                      t.tag_key !== tag.tag_key || t.tag_value !== tag.tag_value
                  )
                )
              }
            >
              <>
                <div>
                  <Tag size={14} />
                </div>
                <span className="ml-1 max-w-[100px] text-ellipsis line-clamp-1 break-all">
                  {tag.tag_key}
                  <b>=</b>
                  {tag.tag_value}
                </span>
              </>
            </SelectedFilter>
          ))}
      </div>
    </div>
  );
}
