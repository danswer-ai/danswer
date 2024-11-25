import { HoverPopup } from "@/components/HoverPopup";
import { SourceIcon } from "@/components/SourceIcon";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import { DanswerDocument } from "@/lib/search/interfaces";
import { FiInfo, FiRadio } from "react-icons/fi";
import { DocumentSelector } from "./DocumentSelector";
import {
  DocumentMetadataBlock,
  buildDocumentSummaryDisplay,
} from "@/components/search/DocumentDisplay";
import { InternetSearchIcon } from "@/components/InternetSearchIcon";

interface DocumentDisplayProps {
  document: DanswerDocument;
  queryEventId: number | null;
  isAIPick: boolean;
  isSelected: boolean;
  handleSelect: (documentId: string) => void;
  setPopup: (popupSpec: PopupSpec | null) => void;
  tokenLimitReached: boolean;
}

export function ChatDocumentDisplay({
  document,
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
    isInternet && document.link
      ? `https://www.google.com/s2/favicons?domain=${
          new URL(document.link).hostname
        }&sz=32`
      : null;

  return (
    <div className="opacity-100 will-change-auto">
      <div
        className={`flex relative flex-col gap-0.5  rounded-xl mx-2 my-1.5 ${
          isSelected ? "bg-gray-200" : "hover:bg-background-125"
        }`}
      >
        <a
          href={document.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col px-2 py-1.5"
        >
          <div className="line-clamp-1 flex h-6 items-center gap-2 text-xs">
            {faviconUrl ? (
              <img
                alt="Favicon"
                width="32"
                height="32"
                className="rounded-full bg-gray-200 object-cover"
                src={faviconUrl}
              />
            ) : (
              <SourceIcon sourceType={document.source_type} iconSize={18} />
            )}
            <span>
              {document.link
                ? new URL(document.link).hostname
                : document.source_type}
            </span>
          </div>
          <div className="line-clamp-2 text-sm font-semibold">
            {document.semantic_identifier || document.document_id}
          </div>
          <div className="line-clamp-2 text-sm font-normal leading-snug text-gray-600">
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
