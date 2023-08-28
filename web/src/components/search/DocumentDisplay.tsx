import { DanswerDocument } from "@/lib/search/interfaces";
import { DocumentFeedbackBlock } from "./DocumentFeedback";
import { getSourceIcon } from "../source";
import { useState } from "react";

interface DocumentDisplayProps {
  document: DanswerDocument;
}

export const DocumentDisplay = ({ document }: DocumentDisplayProps) => {
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
      <div className="flex">
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
          <p className="truncate break-all ml-2">
            {document.semantic_identifier || document.document_id}
          </p>
        </a>
        <div className="ml-auto">
          {isHovered && <DocumentFeedbackBlock queryId={0} />}
        </div>
      </div>
      <p className="pl-1 py-3 text-gray-200">{document.blurb}</p>
    </div>
  );
};
