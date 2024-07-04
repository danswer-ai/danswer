import React, { useState, useEffect } from "react";
import { DanswerDocument } from "@/lib/search/interfaces";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import { DocumentDisplay } from "../DocumentDisplay";
import FunctionalLoader from "@/lib/search/Loader";

interface AnimatedDocumentListProps {
  documents: DanswerDocument[];
  messageId: number | null;
  selectedDocumentIds: Set<string>;
  setPopup: (popupSpec: PopupSpec | null) => void;
  relevance: { [key: string]: boolean };
  comments: { [key: string]: boolean };
}

const AnimatedDocumentList: React.FC<AnimatedDocumentListProps> = ({
  documents,
  messageId,
  selectedDocumentIds,
  setPopup,
  relevance,
  comments,
}) => {
  const [animatingDocuments, setAnimatingDocuments] = useState<
    DanswerDocument[]
  >([]);
  const [removedDocumentIds, setRemovedDocumentIds] = useState<Set<string>>(
    new Set()
  );

  const removeDuplicateDocs = (docs: DanswerDocument[]): DanswerDocument[] => {
    const uniqueDocs = new Map<string, DanswerDocument>();
    docs.forEach((doc) => {
      if (!uniqueDocs.has(doc.document_id)) {
        uniqueDocs.set(doc.document_id, doc);
      }
    });
    return Array.from(uniqueDocs.values());
  };

  useEffect(() => {
    setAnimatingDocuments(removeDuplicateDocs(documents));
  }, [documents]);

  const handleRemoveIrrelevant = () => {
    const irrelevantDocIds = new Set(
      animatingDocuments
        .filter((doc) => !relevance[doc.document_id])
        .map((doc) => doc.document_id)
    );
    setRemovedDocumentIds(irrelevantDocIds);

    // After animation, update the list
    setTimeout(() => {
      setAnimatingDocuments((prevDocs) =>
        prevDocs.filter((doc) => relevance[doc.document_id])
      );
      setRemovedDocumentIds(new Set());
    }, 500); // Match this to the CSS transition duration
  };

  return (
    <div className="mt-4">
      <div className="font-bold text-emphasis border-b mb-3 pb-1 border-border text-lg flex justify-between items-center">
        <span>Results</span>
        {relevance && (
          <button
            onClick={handleRemoveIrrelevant}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Remove Irrelevant Documents
          </button>
        )}
      </div>
      <div>
        {animatingDocuments.map((document, index) => (
          <div
            key={document.semantic_identifier}
            className={`
              transition-all duration-500 overflow-hidden
              ${
                removedDocumentIds.has(document.document_id)
                  ? "opacity-0 translate-x-full max-h-0 my-0 py-0"
                  : "opacity-100 translate-x-0 max-h-[500px] my-2 py-2"
              }
            `}
          >
            <div className="flex relative">
              <div
                className={
                  "absolute top-2/4 -translate-y-2/4 flex " +
                  (selectedDocumentIds.has(document.document_id)
                    ? "-left-14 w-14"
                    : "-left-10 w-10")
                }
              >
                {relevance[document.document_id] !== undefined ? (
                  relevance[document.document_id] ? (
                    <svg
                      className="h-4 w-4 text-xs text-emphasis bg-hover-emphasis rounded p-0.5 w-fit my-auto select-none ml-auto mr-2"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M20 6L9 17l-5-5"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-4 w-4 text-xs text-emphasis bg-hover rounded p-0.5 w-fit my-auto select-none ml-auto mr-2"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M18 6L6 18M6 6l12 12"
                      />
                    </svg>
                  )
                ) : (
                  <div className="text-xs text-emphasis rounded p-0.5 w-fit my-auto select-none ml-auto mr-2">
                    <FunctionalLoader />
                  </div>
                )}
              </div>
              <DocumentDisplay
                document={document}
                messageId={messageId}
                documentRank={index + 1}
                isSelected={selectedDocumentIds.has(document.document_id)}
                setPopup={setPopup}
                relevance={relevance}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnimatedDocumentList;
