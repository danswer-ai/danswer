import { DanswerDocument } from "@/lib/search/interfaces";
import Text from "@/components/ui/text";
import { ChatDocumentDisplay } from "./ChatDocumentDisplay";
import { usePopup } from "@/components/admin/connectors/Popup";
import { removeDuplicateDocs } from "@/lib/documentUtils";
import { Message } from "../interfaces";
import { ForwardedRef, forwardRef } from "react";
import { Separator } from "@/components/ui/separator";
import {
  HorizontalSourceSelector,
  SourceSelector,
} from "@/components/search/filtering/Filters";
import { FilterManager } from "@/lib/hooks";
import { CCPairBasicInfo, DocumentSet, Tag } from "@/lib/types";

interface DocumentSidebarProps {
  filterManager: FilterManager;
  closeSidebar: () => void;
  selectedMessage: Message | null;
  selectedDocuments: DanswerDocument[] | null;
  toggleDocumentSelection: (document: DanswerDocument) => void;
  clearSelectedDocuments: () => void;
  selectedDocumentTokens: number;
  maxTokens: number;
  isLoading: boolean;
  initialWidth: number;
  isOpen: boolean;
  filtersToggled: boolean;
  ccPairs: CCPairBasicInfo[];
  tags: Tag[];
  documentSets: DocumentSet[];
}

export const DocumentSidebar = forwardRef<HTMLDivElement, DocumentSidebarProps>(
  (
    {
      closeSidebar,
      selectedMessage,
      selectedDocuments,
      filterManager,
      toggleDocumentSelection,
      clearSelectedDocuments,
      selectedDocumentTokens,
      maxTokens,
      isLoading,
      initialWidth,
      isOpen,
      filtersToggled,
      ccPairs,
      tags,
      documentSets,
    },
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    const { popup, setPopup } = usePopup();

    const selectedDocumentIds =
      selectedDocuments?.map((document) => document.document_id) || [];

    const currentDocuments = selectedMessage?.documents || null;
    const dedupedDocuments = removeDuplicateDocs(currentDocuments || []);

    // NOTE: do not allow selection if less than 75 tokens are left
    // this is to prevent the case where they are able to select the doc
    // but it basically is unused since it's truncated right at the very
    // start of the document (since title + metadata + misc overhead) takes up
    // space
    const tokenLimitReached = selectedDocumentTokens > maxTokens - 75;

    const hasSelectedDocuments = selectedDocumentIds.length > 0;

    return (
      <div
        id="danswer-chat-sidebar"
        className="w-full"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            closeSidebar();
          }
        }}
      >
        <div
          className={`ml-auto h-screen rounded-l-lg relative border-l sidebar z-50 absolute right-0 h-screen transition-all duration-300 ${
            isOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-[10%]"
          }`}
          ref={ref}
          style={{
            width: initialWidth,
          }}
        >
          <div className="pb-6 flex-initial overflow-y-hidden flex flex-col h-screen">
            {popup}
            <div className="p-4  border-b border-background-400 ">
              <h2 className="text-xl font-bold text-text-900 mb-2">Sources</h2>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-700 ">
                  Add to next search
                </span>
                <a
                  href="https://docs.danswer.dev/introduction"
                  className="text-sm text-primary-600 hover:text-primary-800 transition-colors duration-200 ease-in-out"
                >
                  Learn more
                </a>
              </div>
            </div>

            {currentDocuments ? (
              <div className="overflow-y-auto default-scrollbar pt-4 flex-grow dark-scrollbar flex relative flex-col">
                {filtersToggled && (
                  <div className=" px-4">
                    {" "}
                    <SourceSelector
                      {...filterManager}
                      showDocSidebar={false}
                      // TODO updatef
                      availableDocumentSets={documentSets}
                      existingSources={ccPairs.map((ccPair) => ccPair.source)}
                      availableTags={tags}
                    />
                  </div>
                )}
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
                              (doc) => doc.document_id === documentId
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
                <div className="ml-4 pt-4 mr-3">
                  <Text>
                    When you ask a question, the retrieved documents will show
                    up here!
                  </Text>
                </div>
              )
            )}
          </div>

          <div className="absolute left-0 bottom-0 w-full bg-gradient-to-b from-white/0 via-white/60 to-white dark:from-black/0 dark:via-black/60 dark:to-black h-[100px]" />

          <div
            className={`sticky bottom-4 w-full left-0 flex justify-center transition-opacity duration-300 ${
              hasSelectedDocuments
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <button
              className="text-sm font-medium py-2 px-4 rounded-full transition-colors bg-black hover:bg-gray-900 text-white"
              onClick={() => {
                clearSelectedDocuments();
              }}
            >
              {`Remove ${
                selectedDocumentIds.length > 0 ? selectedDocumentIds.length : ""
              } Source${selectedDocumentIds.length > 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </div>
    );
  }
);

DocumentSidebar.displayName = "DocumentSidebar";
