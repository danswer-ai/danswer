import { HoverPopup } from "@/components/HoverPopup";
import { SourceIcon } from "@/components/SourceIcon";
import { PopupSpec, usePopup } from "@/components/admin/connectors/Popup";
import { DocumentFeedbackBlock } from "@/components/search/DocumentFeedbackBlock";
import { DocumentUpdatedAtBadge } from "@/components/search/DocumentUpdatedAtBadge";
import { DanswerDocument } from "@/lib/search/interfaces";
import { FiInfo, FiRadio } from "react-icons/fi";
import { DocumentSelector } from "./DocumentSelector";
import {
  DocumentMetadataBlock,
  buildDocumentSummaryDisplay,
} from "@/components/search/DocumentDisplay";
import { useState } from "react";

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
  // Consider reintroducing null scored docs in the future

  if (document.score === null) {
    return null;
  }

  return (
    <div
      key={document.semantic_identifier}
      className={`p-2 w-[350px] justify-start rounded-md ${isSelected ? "bg-background-subtle" : "bg-background-weaker"}   text-sm mx-3`}
    >
      <div className=" flex relative justify-start  overflow-y-visible">
        <a
          className={
            "rounded-lg flex font-bold flex-shrink truncate" +
            (document.link ? "" : "pointer-events-none")
          }
        >
          <a href={document.link} target="_blank" rel="noopener noreferrer">
            <SourceIcon sourceType={document.source_type} iconSize={18} />
          </a>
          <p className="overflow-hidden text-left text-ellipsis mx-2 my-auto text-sm ">
            {document.semantic_identifier || document.document_id}
          </p>
        </a>

        <DocumentSelector
          isSelected={isSelected}
          handleSelect={() => handleSelect(document.document_id)}
          isDisabled={tokenLimitReached && !isSelected}
        />
      </div>
      <div>
        <div className="mt-1">
          <DocumentMetadataBlock document={document} />
        </div>
      </div>
      <p className=" line-clamp-3 pl-1 pt-2 pb-1 text-start break-words">
        {buildDocumentSummaryDisplay(document.match_highlights, document.blurb)}
      </p>
      <div className="mb-2">
        {/* 
        // TODO: find a way to include this
        {queryEventId && (
          <DocumentFeedbackBlock
            documentId={document.document_id}
            queryId={queryEventId}
            setPopup={setPopup}
          />
        )} */}
      </div>
    </div>
  );
}
