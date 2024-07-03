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

  const Main = () => {
    return (
      <button
        key={document.semantic_identifier}
        className={`p-2 justify-start cursor-pointer  rounded-md ${isSelected ? "bg-neutral-200" : "hover:bg-background-weakish bg-neutral-100"}   text-sm mx-3`}
      >
        <div className=" flex relative justify-start w-full overflow-y-visible">
          <a
            className={
              "rounded-lg flex font-bold flex-shrink truncate" +
              (document.link ? "" : "pointer-events-none")
            }
            href={document.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            <SourceIcon sourceType={document.source_type} iconSize={18} />
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
        <p className="w-full line-clamp-3 pl-1 pt-2 pb-1 text-start break-words">
          {buildDocumentSummaryDisplay(
            document.match_highlights,
            document.blurb
          )}
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
      </button>
    );
  };
  if (tokenLimitReached && !isSelected) {
    return (
      <div className="ml-auto">
        <HoverPopup
          mainContent={Main()}
          popupContent={
            <div className="w-48">
              LLM context limit reached 😔 If you want to chat with this
              document, please de-select others to free up space.
            </div>
          }
          direction="left-top"
        />
      </div>
    );
  } else {
    return <Main />;
  }
}
