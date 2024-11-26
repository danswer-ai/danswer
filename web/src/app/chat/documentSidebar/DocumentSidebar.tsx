import { DanswerDocument } from "@/lib/search/interfaces";
import Text from "@/components/ui/text";
import { ChatDocumentDisplay } from "./ChatDocumentDisplay";
import { usePopup } from "@/components/admin/connectors/Popup";
import { removeDuplicateDocs } from "@/lib/documentUtils";
import { Message } from "../interfaces";
import { ForwardedRef, forwardRef, useEffect, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { FilterManager } from "@/lib/hooks";
import { CCPairBasicInfo, DocumentSet, Tag } from "@/lib/types";
import { SourceSelector } from "../shared_chat_search/SearchFilters";
import { XIcon } from "@/components/icons/icons";

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
  modal: boolean;
  toggleSidebar: () => void;
  ccPairs: CCPairBasicInfo[];
  tags: Tag[];
  documentSets: DocumentSet[];
  showFilters: boolean;
}

export const DocumentSidebar = forwardRef<HTMLDivElement, DocumentSidebarProps>(
  (
    {
      closeSidebar,
      modal,
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
      toggleSidebar,
      ccPairs,
      tags,
      documentSets,
      showFilters,
    },
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    const { popup, setPopup } = usePopup();
    const [delayedSelectedDocumentCount, setDelayedSelectedDocumentCount] =
      useState(0);

    useEffect(() => {
      const timer = setTimeout(
        () => {
          setDelayedSelectedDocumentCount(selectedDocuments?.length || 0);
        },
        selectedDocuments?.length == 0 ? 1000 : 0
      );

      return () => clearTimeout(timer);
    }, [selectedDocuments]);

    const selectedDocumentIds =
      selectedDocuments?.map((document) => document.document_id) || [];

    const currentDocuments = selectedMessage?.documents || null;
    const dedupedDocuments = removeDuplicateDocs(currentDocuments || []);

    const tokenLimitReached = selectedDocumentTokens > maxTokens - 75;

    const hasSelectedDocuments = selectedDocumentIds.length > 0;

    return (
      <div
        id="danswer-chat-sidebar"
        className={` w-full  ${!modal ? "border-l border-sidebar-border" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            closeSidebar();
          }
        }}
      >
        <div
          className={`ml-auto h-screen relative sidebar z-50 absolute right-0 h-screen transition-all duration-300 ${
            isOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-[10%]"
          }`}
          ref={ref}
          style={{
            width: initialWidth,
          }}
        >
          <div className=" flex-initial overflow-y-hidden flex flex-col h-screen">
            {popup}
            <div className="p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-text-900">
                {showFilters ? "Filters" : "Sources"}
              </h2>
              <button
                onClick={closeSidebar}
                className="text-sm text-primary-600 hover:text-primary-800 transition-colors duration-200 ease-in-out"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="border-b border-divider-history-sidebar-bar mx-3" />

            <div className="overflow-y-auto gap-y-0 default-scrollbar flex-grow dark-scrollbar flex relative flex-col">
              {showFilters ? (
                <SourceSelector
                  modal={modal}
                  tagsOnLeft={true}
                  toggleFilters={() => {}}
                  filtersUntoggled={false}
                  {...filterManager}
                  showDocSidebar={false}
                  availableDocumentSets={documentSets}
                  existingSources={ccPairs.map((ccPair) => ccPair.source)}
                  availableTags={tags}
                />
              ) : (
                <>
                  {dedupedDocuments.length > 0 ? (
                    dedupedDocuments.map((document, ind) => (
                      <div
                        key={document.document_id}
                        className={`${
                          ind === dedupedDocuments.length - 1
                            ? ""
                            : "border-b border-border-light w-full "
                        }`}
                      >
                        <ChatDocumentDisplay
                          modal={modal}
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
                    <div className="mx-3" />
                  )}
                </>
              )}
            </div>
          </div>

          {!showFilters && (
            <>
              {/* <div className="fixed left-0 bottom-0 w-full bg-gradient-to-b from-white/0 via-white/60 to-white dark:from-black/0 dark:via-black/60 dark:to-black h-[100px]" /> */}

              <div
                className={`sticky bottom-4  ${
                  modal ? " w-[90vw]" : "w-full"
                } left-0 flex justify-center transition-opacity duration-300 ${
                  hasSelectedDocuments
                    ? "opacity-100"
                    : "opacity-0 pointer-events-none"
                }`}
              >
                <button
                  className="text-sm font-medium py-2 px-4 rounded-full transition-colors bg-gray-900 text-white"
                  onClick={() => {
                    clearSelectedDocuments();
                  }}
                >
                  {`Remove ${
                    delayedSelectedDocumentCount > 0
                      ? delayedSelectedDocumentCount
                      : ""
                  } Source${delayedSelectedDocumentCount > 1 ? "s" : ""}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
);

DocumentSidebar.displayName = "DocumentSidebar";
