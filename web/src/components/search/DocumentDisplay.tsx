import { DanswerDocument } from "@/lib/search/interfaces";
import { DocumentFeedbackBlock } from "./DocumentFeedbackBlock";
import { getSourceIcon } from "../source";
import { useState } from "react";
import { PopupSpec } from "../admin/connectors/Popup";

interface DocumentDisplayProps {
  document: DanswerDocument;
  queryEventId: number | null;
  setPopup: (popupSpec: PopupSpec | null) => void;
}

export const DocumentDisplay = ({
  document,
  queryEventId,
  setPopup,
}: DocumentDisplayProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      key={document.semantic_identifier}
      className="text-sm border-b border-gray-800 mb-3"
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex relative">
        <div className="absolute -left-10 top-2/4 -translate-y-2/4 w-10 flex">
          <div
            className={`
          text-xs 
          text-gray-200 
          bg-gray-800 
          rounded 
          p-0.5 
          w-fit 
          my-auto 
          select-none 
          ml-auto 
          mr-2`}
          >
            {document.score.toFixed(2)}
          </div>
        </div>
        <a
          className={
            "rounded-lg flex font-bold " +
            (document.link ? "" : "pointer-events-none")
          }
          href={document.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          {getSourceIcon(document.source_type, 20)}
          <p className="truncate break-all ml-2 my-auto">
            {document.semantic_identifier || document.document_id}
          </p>
        </a>
        <div className="ml-auto">
          {isHovered && queryEventId && (
            <DocumentFeedbackBlock
              documentId={document.document_id}
              queryId={queryEventId}
              setPopup={setPopup}
            />
          )}
        </div>
      </div>
      <p className="pl-1 pt-2 pb-3 text-gray-200">{document.blurb}</p>
    </div>
  );
};
