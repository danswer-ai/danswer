import { HoverPopup } from "@/components/HoverPopup";
import { SourceIcon } from "@/components/SourceIcon";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import { DocumentFeedbackBlock } from "@/components/search/DocumentFeedbackBlock";
import { DocumentUpdatedAtBadge } from "@/components/search/DocumentUpdatedAtBadge";
import { DanswerDocument } from "@/lib/search/interfaces";
import { FiInfo, FiRadio } from "react-icons/fi";
import { DocumentSelector } from "./DocumentSelector";
import {
  DocumentMetadataBlock,
  buildDocumentSummaryDisplay,
} from "@/components/search/DocumentDisplay";

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
    <div key={document.semantic_identifier} className="text-sm px-3">
      <div className="flex relative w-full overflow-y-visible">
        <a
          className={
            "rounded-lg flex font-bold flex-shrink truncate " +
            (document.link ? "" : "pointer-events-none")
          }
          href={document.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          <SourceIcon sourceType={document.source_type} iconSize={18} />
          <p className="overflow-hidden text-ellipsis mx-2 my-auto text-sm ">
            {document.semantic_identifier || document.document_id}
          </p>
        </a>
        {document.score !== null && (
          <div className="my-auto">
            {isAIPick && (
              <div className="w-4 h-4 my-auto mr-1 flex flex-col">
                <HoverPopup
                  mainContent={<FiRadio className="text-gray-500 my-auto" />}
                  popupContent={
                    <div className="text-xs text-gray-300 w-36 flex">
                      <div className="flex mx-auto">
                        <div className="w-3 h-3 flex flex-col my-auto mr-1">
                          <FiInfo className="my-auto" />
                        </div>
                        <div className="my-auto">The AI liked this doc!</div>
                      </div>
                    </div>
                  }
                  direction="bottom"
                  style="dark"
                />
              </div>
            )}
            <div
              className={`
                text-xs
                text-emphasis
                bg-hover
                rounded
                p-0.5
                w-fit
                my-auto
                select-none
                my-auto
                mr-2`}
            >
              {Math.abs(document.score).toFixed(2)}
            </div>
          </div>
        )}

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
      <p className="pl-1 pt-2 pb-1 break-words">
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
