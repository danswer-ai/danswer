"use client";

import { adminSearch } from "./lib";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useState, useEffect } from "react";
import { DanswerDocument } from "@/lib/search/interfaces";
import { getSourceIcon } from "@/components/source";
import { buildDocumentSummaryDisplay } from "@/components/search/DocumentDisplay";
import { CustomCheckbox } from "@/components/CustomCheckbox";
import { updateHiddenStatus } from "../lib";
import { PopupSpec, usePopup } from "@/components/admin/connectors/Popup";
import { getErrorMsg } from "@/lib/fetchUtils";
import { ScoreSection } from "../ScoreEditor";
import { useRouter } from "next/navigation";
import { HorizontalFilters } from "@/components/search/filtering/Filters";
import { useFilters } from "@/lib/hooks";
import { buildFilters } from "@/lib/search/utils";
import { DocumentUpdatedAtBadge } from "@/components/search/DocumentUpdatedAtBadge";
import { Connector, DocumentSet } from "@/lib/types";

const DocumentDisplay = ({
  document,
  refresh,
  setPopup,
}: {
  document: DanswerDocument;
  refresh: () => void;
  setPopup: (popupSpec: PopupSpec | null) => void;
}) => {
  return (
    <div
      key={document.document_id}
      className="text-sm border-b border-gray-800 mb-3"
    >
      <div className="flex relative">
        <a
          className={
            "rounded-lg flex font-bold " +
            (document.link ? "" : "pointer-events-none")
          }
          href={document.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          {getSourceIcon(document.source_type, 22)}
          <p className="truncate break-all ml-2 my-auto text-base">
            {document.semantic_identifier || document.document_id}
          </p>
        </a>
      </div>
      <div className="flex flex-wrap gap-x-2 mt-1 text-xs">
        <div className="px-1 py-0.5 bg-gray-700 rounded flex">
          <p className="mr-1 my-auto">Boost:</p>
          <ScoreSection
            documentId={document.document_id}
            initialScore={document.boost}
            setPopup={setPopup}
            refresh={refresh}
            consistentWidth={false}
          />
        </div>
        <div
          onClick={async () => {
            const response = await updateHiddenStatus(
              document.document_id,
              !document.hidden
            );
            if (response.ok) {
              refresh();
            } else {
              setPopup({
                type: "error",
                message: `Failed to update document - ${getErrorMsg(
                  response
                )}}`,
              });
            }
          }}
          className="px-1 py-0.5 bg-gray-700 hover:bg-gray-600 rounded flex cursor-pointer select-none"
        >
          <div className="my-auto">
            {document.hidden ? (
              <div className="text-red-500">Hidden</div>
            ) : (
              "Visible"
            )}
          </div>
          <div className="ml-1 my-auto">
            <CustomCheckbox checked={!document.hidden} />
          </div>
        </div>
      </div>
      {document.updated_at && (
        <div className="mt-2">
          <DocumentUpdatedAtBadge updatedAt={document.updated_at} />
        </div>
      )}
      <p className="pl-1 pt-2 pb-3 text-gray-200 break-words">
        {buildDocumentSummaryDisplay(document.match_highlights, document.blurb)}
      </p>
    </div>
  );
};

export function Explorer({
  initialSearchValue,
  connectors,
  documentSets,
}: {
  initialSearchValue: string | undefined;
  connectors: Connector<any>[];
  documentSets: DocumentSet[];
}) {
  console.log(connectors);
  const router = useRouter();
  const { popup, setPopup } = usePopup();

  const [query, setQuery] = useState(initialSearchValue || "");
  const [timeoutId, setTimeoutId] = useState<number | null>(null);
  const [results, setResults] = useState<DanswerDocument[]>([]);

  const filterManager = useFilters();

  const onSearch = async (query: string) => {
    const filters = buildFilters(
      filterManager.selectedSources,
      filterManager.selectedDocumentSets,
      filterManager.timeRange
    );
    const results = await adminSearch(query, filters);
    if (results.ok) {
      setResults((await results.json()).documents);
    }
    setTimeoutId(null);
  };

  useEffect(() => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    if (query && query.trim() !== "") {
      router.replace(
        `/admin/documents/explorer?query=${encodeURIComponent(query)}`
      );

      const newTimeoutId = window.setTimeout(() => onSearch(query), 300);
      setTimeoutId(newTimeoutId);
    } else {
      setResults([]);
    }
  }, [
    query,
    filterManager.selectedDocumentSets,
    filterManager.selectedSources,
    filterManager.timeRange,
  ]);

  return (
    <div>
      {popup}
      <div className="justify-center py-2">
        <div className="flex items-center w-full border-2 border-gray-600 rounded px-4 py-2 focus-within:border-blue-500">
          <MagnifyingGlass className="text-gray-400" />
          <textarea
            autoFocus
            className="flex-grow ml-2 h-6 bg-transparent outline-none placeholder-gray-400 overflow-hidden whitespace-normal resize-none"
            role="textarea"
            aria-multiline
            placeholder="Find documents based on title / content..."
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                onSearch(query);
                event.preventDefault();
              }
            }}
            suppressContentEditableWarning={true}
          />
        </div>
        <div className="mt-4">
          <HorizontalFilters
            {...filterManager}
            availableDocumentSets={documentSets}
            existingSources={connectors.map((connector) => connector.source)}
          />
        </div>
      </div>
      {results.length > 0 && (
        <div className="mt-3">
          {results.map((document) => {
            return (
              <DocumentDisplay
                key={document.document_id}
                document={document}
                refresh={() => onSearch(query)}
                setPopup={setPopup}
              />
            );
          })}
        </div>
      )}
      {!query && (
        <div className="flex text-gray-400 mt-3">
          Search for a document above to modify it&apos;s boost or hide it from
          searches.
        </div>
      )}
    </div>
  );
}
