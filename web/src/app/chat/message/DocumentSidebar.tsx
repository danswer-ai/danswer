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

// interface DocumentListProps {
//   docs: Document[];
//   isComplete: boolean;
//   citedDocuments: [string, { document_id: string }][] | null;
// }

// export const DocumentList: React.FC<DocumentListProps> = ({ docs, isComplete, citedDocuments }) => {
//   const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
//   const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

//   const handleSelectDoc = (doc: Document) => {
//     setSelectedDoc(doc);
//     setIsSidebarOpen(true);
//   };

//   const handleCloseSidebar = () => {
//     setIsSidebarOpen(false);
//   };

//   return (
//     <div className="w-full flex">
//       <div className="w-full relative overflow-x-scroll no-scrollbar">
//         <div className="flex gap-x-2">
//           {docs
//             .filter(
//               (doc, index, self) =>
//                 doc.document_id &&
//                 doc.document_id !== "" &&
//                 index ===
//                 self.findIndex(
//                   (d) => d.document_id === doc.document_id
//                 )
//             )
//             .map((doc) => (
//               <DocumentCard
//                 key={doc.document_id}
//                 doc={doc}
//                 isComplete={isComplete}
//                 citedDocuments={citedDocuments}
//                 onSelect={handleSelectDoc}
//               />
//             ))}
//         </div>
//       </div>
//       <button className="my-auto h-full flex-none p-2">
//         <svg
//           className="text-neutral-700 hover:text-neutral-900 h-6 w-6"
//           xmlns="http://www.w3.org/2000/svg"
//           width="200"
//           height="200"
//           viewBox="0 0 16 16"
//         >
//           <g fill="currentColor">
//             <path d="M6.22 8.72a.75.75 0 0 0 1.06 1.06l5.22-5.22v1.69a.75.75 0 0 0 1.5 0v-3.5a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0 0 1.5h1.69z" />
//             <path d="M3.5 6.75c0-.69.56-1.25 1.25-1.25H7A.75.75 0 0 0 7 4H4.75A2.75 2.75 0 0 0 2 6.75v4.5A2.75 2.75 0 0 0 4.75 14h4.5A2.75 2.75 0 0 0 12 11.25V9a.75.75 0 0 0-1.5 0v2.25c0 .69-.56 1.25-1.25 1.25h-4.5c-.69 0-1.25-.56-1.25-1.25z" />
//           </g>
//         </svg>
//       </button>
//       <Sidebar
//         isOpen={isSidebarOpen}
//         onClose={handleCloseSidebar}
//         selectedDoc={selectedDoc}
//       />
//     </div>
//   );
// };
