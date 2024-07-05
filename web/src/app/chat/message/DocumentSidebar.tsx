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

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDoc: DanswerDocument | null;
}

export const DocSidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  selectedDoc,
}) => {
  if (!selectedDoc) return null;

  return (
    <div
      className={`absolute z-[100000] left-0 top-0 h-full  inset-y-0 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="p-4">
        <button
          onClick={onClose}
          className="mb-4 text-gray-500 hover:text-gray-700"
        >
          Close
        </button>
        <h2 className="text-lg font-semibold mb-2">
          {selectedDoc.document_id.split("/").pop()}
        </h2>
        <a
          href={selectedDoc.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block mb-2 text-blue-600 hover:underline"
        >
          Open Document
        </a>
        <button
          onClick={() => {
            // Add your citation logic here
            console.log("Cite document:", selectedDoc.document_id);
          }}
          className="block w-full text-left py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          Cite Document
        </button>
        <button
          onClick={() => {
            // Add your download logic here
            console.log("Download document:", selectedDoc.document_id);
          }}
          className="block w-full text-left py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          Download
        </button>
        <div className="mt-4">
          <h3 className="font-semibold mb-1">Document Details:</h3>
          <p className="text-sm">{selectedDoc.blurb}</p>
        </div>
      </div>
    </div>
  );
};
