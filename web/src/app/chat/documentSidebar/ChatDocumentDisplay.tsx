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

  return (
    <div key={document.semantic_identifier} className="text-sm px-3">
      <div className="flex relative w-full overflow-y-visible">
        <a
          className={
            "rounded-lg flex font-bold flex-shrink truncate items-center " +
            (document.link ? "" : "pointer-events-none")
          }
          href={document.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          {isInternet ? (
            <InternetSearchIcon url={document.link} />
          ) : (
            <SourceIcon sourceType={document.source_type} iconSize={18} />
          )}
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
          </div>
        )}

        {!isInternet && (
          <DocumentSelector
            isSelected={isSelected}
            handleSelect={() => handleSelect(document.document_id)}
            isDisabled={tokenLimitReached && !isSelected}
          />
        )}
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
