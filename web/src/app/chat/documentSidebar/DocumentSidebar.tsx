import { DanswerDocument } from "@/lib/search/interfaces";
import { Divider, Text } from "@tremor/react";
import { ChatDocumentDisplay } from "./ChatDocumentDisplay";
import { usePopup } from "@/components/admin/connectors/Popup";
import { removeDuplicateDocs } from "@/lib/documentUtils";
import { Message } from "../interfaces";
import { ForwardedRef, forwardRef } from "react";

interface DocumentSidebarProps {
  closeSidebar: () => void;
  currentDocuments: DanswerDocument[] | null;
  selectedDocuments: DanswerDocument[] | null;
  toggleDocumentSelection: (document: DanswerDocument) => void;
  clearSelectedDocuments: () => void;
  selectedDocumentTokens: number;
  maxTokens: number;
  isLoading: boolean;
  initialWidth: number;
  isOpen: boolean;
}

export const DocumentSidebar = forwardRef<HTMLDivElement, DocumentSidebarProps>(
  (
    {
      closeSidebar,
      currentDocuments,
      selectedDocuments,
      toggleDocumentSelection,
      clearSelectedDocuments,
      selectedDocumentTokens,
      maxTokens,
      isLoading,
      initialWidth,
      isOpen,
    },
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    const { popup, setPopup } = usePopup();

    const selectedDocumentIds =
      selectedDocuments?.map((document) => document.document_id) || [];

    const dedupedDocuments = removeDuplicateDocs(currentDocuments || []);

    // NOTE: do not allow selection if less than 75 tokens are left
    // this is to prevent the case where they are able to select the doc
    // but it basically is unused since it's truncated right at the very
    // start of the document (since title + metadata + misc overhead) takes up
    // space
    const tokenLimitReached = selectedDocumentTokens > maxTokens - 75;

    return (
      <div
        className={`fixed inset-0 transition-opacity duration-300 z-50 bg-black/80 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            closeSidebar();
          }
        }}
      >
        <div
          className={`ml-auto rounded-l-lg relative border-l bg-text-100 sidebar z-50 absolute right-0 h-screen transition-all duration-300 ${
            isOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-[10%]"
          }`}
          ref={ref}
          style={{
            width: initialWidth,
          }}
        >
          <div className="pb-6 flex-initial overflow-y-hidden flex flex-col h-screen ">
            {popup}
            <div className="pl-3 mx-2 pr-6 mt-3 flex text-text-800 flex-col text-2xl text-emphasis flex font-semibold">
              {dedupedDocuments.length} Documents
              <p className="text-sm  flex flex-wrap gap-x-2 font-normal text-text-700 mt-1">
                Select to add to continuous context
              </p>
            </div>

            <Divider className="mb-0 mt-4 pb-2" />

            {currentDocuments ? (
              <div className="overflow-y-auto flex-grow dark-scrollbar flex relative flex-col">
                {dedupedDocuments.length > 0 ? (
                  dedupedDocuments.map((document, ind) => (
                    <div
                      key={document.document_id}
                      className={`${
                        ind === dedupedDocuments.length - 1
                          ? "mb-5"
                          : "border-b border-border-light mb-3"
                      }`}
                    >
                      <ChatDocumentDisplay
                        document={document}
                        setPopup={setPopup}
                        queryEventId={null}
                        isAIPick={false}
                        isSelected={selectedDocumentIds.includes(
                          document.document_id
                        )}
                        handleSelect={(documentId) => {
                          toggleDocumentSelection(
                            dedupedDocuments.find(
                              (document) => document.document_id === documentId
                            )!
                          );
                        }}
                        tokenLimitReached={tokenLimitReached}
                      />
                    </div>
                  ))
                ) : (
                  <div className="mx-3">
                    <Text>No documents found for the query.</Text>
                  </div>
                )}
              </div>
            ) : (
              !isLoading && (
                <div className="ml-4 mr-3">
                  <Text>
                    When you run ask a question, the retrieved documents will
                    show up here!
                  </Text>
                </div>
              )
            )}
          </div>

          <div className="absolute left-0 bottom-0 w-full bg-gradient-to-b from-neutral-100/0 via-neutral-100/40 backdrop-blur-xs to-neutral-100 h-[100px]" />
          <div className="sticky bottom-4 w-full left-0 justify-center flex gap-x-4">
            <button
              className="bg-background-800 px-3 hover:bg-background-600 transition-background duration-300 py-2.5 scale-[.95] rounded text-text-200"
              onClick={() => closeSidebar()}
            >
              Save Changes
            </button>

            <button
              className="bg-background-125 hover:bg-background-150 transition-background duration-300 ring ring-1 ring-border scale-[.95] px-3  py-2.5 rounded text-text-900"
              onClick={() => {
                clearSelectedDocuments();

                closeSidebar();
              }}
            >
              Delete Context
            </button>
          </div>
        </div>
      </div>
    );
  }
);

DocumentSidebar.displayName = "DocumentSidebar";
