import { DocumentMetadataBlock } from "@/components/search/DocumentDisplay";
import { SourceIcon } from "@/components/SourceIcon";
import { DanswerDocument } from "@/lib/search/interfaces";
import React, { useState } from "react";

interface DocumentCardProps {
  doc: DanswerDocument;
  isComplete: boolean;
  citedDocuments: [string, { document_id: string }][] | null;
  onSelect: (doc: DanswerDocument) => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({
  doc,
  isComplete,
  citedDocuments,
  onSelect,
}) => {
  return (
    <div
      key={doc.document_id}
      className={`w-[200px] rounded-lg flex-none transition-all duration-500 opacity-90 hover:bg-neutral-200 bg-neutral-100 px-4 py-2 border-b cursor-pointer
        ${
          !isComplete
            ? "animate-pulse"
            : citedDocuments &&
              (Array.isArray(citedDocuments) &&
              citedDocuments.some(
                ([_, obj]) => obj.document_id === doc.document_id
              )
                ? "!opacity-100"
                : "!opacity-20")
        }`}
      onClick={() => onSelect(doc)}
    >
      <div className="text-sm flex justify-between font-semibold text-neutral-800">
        <p className="line-clamp-1">
          {doc.document_id.split("/")[doc.document_id.split("/").length - 1]}
        </p>
        <div className="flex-none">
          <SourceIcon sourceType={doc.source_type} iconSize={18} />
        </div>
      </div>

      <div className="flex overscroll-x-scroll mt-1">
        <DocumentMetadataBlock document={doc} />
      </div>

      <div className="line-clamp-3 text-xs break-words pt-1">{doc.blurb}</div>
    </div>
  );
};
