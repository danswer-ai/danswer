import React from "react";
import { getSourceIcon } from "../source";
import { Funnel } from "@phosphor-icons/react";
import { DocumentSet, ValidSources } from "@/lib/types";
import { Source } from "@/lib/search/interfaces";
import {
  BookmarkIcon,
  InfoIcon,
  NotebookIcon,
  defaultTailwindCSS,
} from "../icons/icons";
import { HoverPopup } from "../HoverPopup";
import { FiFilter } from "react-icons/fi";

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
  { displayName: "File", internalName: "file" },
  { displayName: "Notion", internalName: "notion" },
  { displayName: "Zulip", internalName: "zulip" },
  { displayName: "Linear", internalName: "linear" },
  { displayName: "HubSpot", internalName: "hubspot" },
];

interface SourceSelectorProps {
  selectedSources: Source[];
  setSelectedSources: React.Dispatch<React.SetStateAction<Source[]>>;
  selectedDocumentSets: string[];
  setSelectedDocumentSets: React.Dispatch<React.SetStateAction<string[]>>;
  availableDocumentSets: DocumentSet[];
  existingSources: ValidSources[];
}

export function SourceSelector({
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

      {existingSources.length > 0 && (
        <>
          <div className="font-medium text-sm flex">Sources</div>
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
        </>
      )}

      {availableDocumentSets.length > 0 && (
        <>
          <div className="mt-4">
            <div className="font-medium text-sm flex">Knowledge Sets</div>
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
