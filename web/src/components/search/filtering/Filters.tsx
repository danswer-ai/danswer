import React from "react";
import { getSourceIcon } from "../../source";
import { DocumentSet, ValidSources } from "@/lib/types";
import { Source } from "@/lib/search/interfaces";
import { InfoIcon, defaultTailwindCSS } from "../../icons/icons";
import { HoverPopup } from "../../HoverPopup";
import { FiBook, FiBookmark, FiFilter, FiMap, FiX } from "react-icons/fi";
import { DateRangeSelector } from "../DateRangeSelector";
import { DateRangePickerValue } from "@tremor/react";
import { FilterDropdown } from "./FilterDropdown";

const sources: Source[] = [
  { displayName: "Google Drive", internalName: "google_drive" },
  { displayName: "Slack", internalName: "slack" },
  { displayName: "BookStack", internalName: "bookstack" },
  { displayName: "Confluence", internalName: "confluence" },
  { displayName: "Jira", internalName: "jira" },
  { displayName: "Productboard", internalName: "productboard" },
  { displayName: "Slab", internalName: "slab" },
  { displayName: "Github PRs", internalName: "github" },
  { displayName: "Web", internalName: "web" },
  { displayName: "Guru", internalName: "guru" },
  { displayName: "Gong", internalName: "gong" },
  { displayName: "File", internalName: "file" },
  { displayName: "Notion", internalName: "notion" },
  { displayName: "Zulip", internalName: "zulip" },
  { displayName: "Linear", internalName: "linear" },
  { displayName: "HubSpot", internalName: "hubspot" },
  { displayName: "Document360", internalName: "document360" },
  { displayName: "Request Tracker", internalName: "requesttracker" },
  { displayName: "Google Sites", internalName: "google_sites" },
];

const SectionTitle = ({ children }: { children: string }) => (
  <div className="font-medium text-sm flex">{children}</div>
);

interface SourceSelectorProps {
  timeRange: DateRangePickerValue | null;
  setTimeRange: React.Dispatch<
    React.SetStateAction<DateRangePickerValue | null>
  >;
  selectedSources: Source[];
  setSelectedSources: React.Dispatch<React.SetStateAction<Source[]>>;
  selectedDocumentSets: string[];
  setSelectedDocumentSets: React.Dispatch<React.SetStateAction<string[]>>;
  availableDocumentSets: DocumentSet[];
  existingSources: ValidSources[];
}

export function SourceSelector({
  timeRange,
  setTimeRange,
  selectedSources,
  setSelectedSources,
  selectedDocumentSets,
  setSelectedDocumentSets,
  availableDocumentSets,
  existingSources,
}: SourceSelectorProps) {
  const handleSelect = (source: Source) => {
    setSelectedSources((prev: Source[]) => {
      if (prev.includes(source)) {
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
    <div>
      <div className="flex mb-2 pb-1 border-b border-gray-800">
        <h2 className="font-bold my-auto">Filters</h2>
        <FiFilter className="my-auto ml-2" size="18" />
      </div>

      <>
        <SectionTitle>Time Range</SectionTitle>
        <div className="mt-2">
          <DateRangeSelector value={timeRange} onValueChange={setTimeRange} />
        </div>
      </>

      {existingSources.length > 0 && (
        <div className="mt-4">
          <SectionTitle>Sources</SectionTitle>
          <div className="px-1">
            {sources
              .filter((source) => existingSources.includes(source.internalName))
              .map((source) => (
                <div
                  key={source.internalName}
                  className={
                    "flex cursor-pointer w-full items-center text-white " +
                    "py-1.5 my-1.5 rounded-lg px-2 " +
                    (selectedSources.includes(source)
                      ? "bg-gray-700"
                      : "hover:bg-gray-800")
                  }
                  onClick={() => handleSelect(source)}
                >
                  {getSourceIcon(source.internalName, 16)}
                  <span className="ml-2 text-sm text-gray-200">
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
                    "flex cursor-pointer w-full items-center text-white " +
                    "py-1.5 rounded-lg px-2 " +
                    (selectedDocumentSets.includes(documentSet.name)
                      ? "bg-gray-700"
                      : "hover:bg-gray-800")
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
                        <div className="flex font-medium text-gray-200">
                          Description
                        </div>
                        <div className="mt-1 text-gray-300">
                          {documentSet.description}
                        </div>
                      </div>
                    }
                    classNameModifications="-ml-2"
                  />
                  <span className="text-sm text-gray-200">
                    {documentSet.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
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
        "flex cursor-pointer items-center text-white border border-gray-800 " +
        "py-1 my-1.5 rounded-lg px-2 w-fit bg-dark-tremor-background-muted hover:bg-gray-800"
      }
      onClick={onClick}
    >
      {children}
      <FiX className="ml-2 text-gray-400" size={14} />
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
  const handleSourceSelect = (source: Source) => {
    setSelectedSources((prev: Source[]) => {
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

  const availableSources = sources.filter((source) =>
    existingSources.includes(source.internalName)
  );

  return (
    <div className="dark">
      <div className="flex gap-x-3">
        <div className="w-64">
          <DateRangeSelector value={timeRange} onValueChange={setTimeRange} />
        </div>

        <FilterDropdown
          options={availableSources.map((source) => {
            return {
              key: source.displayName,
              display: (
                <>
                  {" "}
                  {getSourceIcon(source.internalName, 16)}
                  <span className="ml-2 text-sm text-gray-200">
                    {source.displayName}
                  </span>
                </>
              ),
            };
          })}
          selected={selectedSources.map((source) => source.displayName)}
          handleSelect={(option) =>
            handleSourceSelect(
              sources.find((source) => source.displayName === option.key)!
            )
          }
          icon={
            <div className="my-auto mr-2 text-gray-500 w-[16px] h-[16px]">
              <FiMap size={16} />
            </div>
          }
          defaultDisplay="All Sources"
        />

        <FilterDropdown
          options={availableDocumentSets.map((documentSet) => {
            return {
              key: documentSet.name,
              display: (
                <>
                  <div className="text-gray-500 my-auto">
                    <FiBookmark />
                  </div>
                  <span className="ml-2 text-sm text-gray-200">
                    {documentSet.name}
                  </span>
                </>
              ),
            };
          })}
          selected={selectedDocumentSets}
          handleSelect={(option) => handleDocumentSetSelect(option.key)}
          icon={
            <div className="my-auto mr-2 text-gray-500 w-[16px] h-[16px]">
              <FiBook size={16} />
            </div>
          }
          defaultDisplay="All Document Sets"
        />
      </div>

      <div className="flex border-b border-gray-800 pb-4 mt-2 h-12">
        <div className="flex flex-wrap gap-x-2">
          {timeRange && timeRange.selectValue && (
            <SelectedBubble onClick={() => setTimeRange(null)}>
              <div className="text-sm flex text-gray-400">
                {timeRange.selectValue}
              </div>
            </SelectedBubble>
          )}
          {existingSources.length > 0 &&
            selectedSources.map((source) => (
              <SelectedBubble
                key={source.internalName}
                onClick={() => handleSourceSelect(source)}
              >
                <>
                  {getSourceIcon(source.internalName, 16)}
                  <span className="ml-2 text-sm text-gray-400">
                    {source.displayName}
                  </span>
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
                  <div className="text-gray-500">
                    <FiBookmark />
                  </div>
                  <span className="ml-2 text-sm text-gray-400">
                    {documentSetName}
                  </span>
                </>
              </SelectedBubble>
            ))}
        </div>
      </div>
    </div>
  );
}
