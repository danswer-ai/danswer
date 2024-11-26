import { HoverPopup } from "@/components/HoverPopup";
import { SourceIcon } from "@/components/SourceIcon";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import { DanswerDocument } from "@/lib/search/interfaces";
import { FiInfo, FiRadio, FiTag } from "react-icons/fi";
import { DocumentSelector } from "./DocumentSelector";
import { buildDocumentSummaryDisplay } from "@/components/search/DocumentDisplay";
import { SearchResultIcon } from "@/components/SearchResultIcon";
import { DocumentUpdatedAtBadge } from "@/components/search/DocumentUpdatedAtBadge";
import { MetadataBadge } from "@/components/MetadataBadge";
import faviconFetch from "favicon-fetch";

interface DocumentDisplayProps {
  document: DanswerDocument;
  queryEventId: number | null;
  modal?: boolean;
  isAIPick: boolean;
  isSelected: boolean;
  handleSelect: (documentId: string) => void;
  setPopup: (popupSpec: PopupSpec | null) => void;
  tokenLimitReached: boolean;
}

export function DocumentMetadataBlock({
  modal,
  document,
}: {
  modal?: boolean;
  document: DanswerDocument;
}) {
  const MAX_METADATA_ITEMS = 3;
  const metadataEntries = Object.entries(document.metadata);

  return (
    <div className="flex items-center overflow-hidden">
      {document.updated_at && (
        <DocumentUpdatedAtBadge updatedAt={document.updated_at} modal={modal} />
      )}

      {metadataEntries.length > 0 && (
        <>
          <div className="mx-1 h-4 border-l border-border" />
          <div className="flex items-center overflow-hidden">
            {metadataEntries
              .slice(0, MAX_METADATA_ITEMS)
              .map(([key, value], index) => (
                <MetadataBadge icon={FiTag} value={`${key}=${value}`} />
              ))}
            {metadataEntries.length > MAX_METADATA_ITEMS && (
              <span className="ml-1 text-xs text-gray-500">...</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function ChatDocumentDisplay({
  document,
  modal,
  queryEventId,
  isAIPick,
  isSelected,
  handleSelect,
  setPopup,
  tokenLimitReached,
}: DocumentDisplayProps) {
  const isInternet = document.is_internet;

  if (document.score === null) {
    return null;
  }

  const faviconUrl =
    (isInternet || document.source_type === "web") && document.link
      ? faviconFetch({ uri: document.link })
      : null;

  return (
    <div className={`opacity-100   ${modal ? "w-[90vw]" : "w-full"}`}>
      <div
        className={`flex relative flex-col gap-0.5  rounded-xl mx-2 my-1 ${
          isSelected ? "bg-gray-200" : "hover:bg-background-125"
        }`}
      >
        <a
          href={document.link}
          target="_blank"
          rel="noopener noreferrer"
          className="cursor-pointer flex flex-col px-2 py-1.5"
        >
          <div className="line-clamp-1 mb-1 flex h-6 items-center gap-2 text-xs">
            {faviconUrl ? (
              <img
                alt="Favicon"
                width="18"
                height="18"
                className="rounded-full bg-gray-200 object-cover"
                src={faviconUrl}
              />
            ) : (
              <SourceIcon sourceType={document.source_type} iconSize={18} />
            )}
            <div className="line-clamp-1 text-text-900 text-sm font-semibold">
              {(document.semantic_identifier || document.document_id).length >
              (modal ? 30 : 40)
                ? `${(document.semantic_identifier || document.document_id)
                    .slice(0, modal ? 30 : 40)
                    .trim()}...`
                : document.semantic_identifier || document.document_id}
            </div>
          </div>
          <DocumentMetadataBlock modal={modal} document={document} />
          <div className="line-clamp-3 pt-2 text-sm font-normal leading-snug text-gray-600">
            {buildDocumentSummaryDisplay(
              document.match_highlights,
              document.blurb
            )}
          </div>
          <div className="absolute top-2 right-2">
            {!isInternet && (
              <DocumentSelector
                isSelected={isSelected}
                handleSelect={() => handleSelect(document.document_id)}
                isDisabled={tokenLimitReached && !isSelected}
              />
            )}
          </div>
        </a>
      </div>
    </div>
  );
}
