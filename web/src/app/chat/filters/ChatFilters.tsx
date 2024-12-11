import { DanswerDocument } from "@/lib/search/interfaces";
import { ChatDocumentDisplay, ChatFileDisplay } from "./ChatDocumentDisplay";
import { usePopup } from "@/components/admin/connectors/Popup";
import { removeDuplicateDocs } from "@/lib/documentUtils";
import { FileDescriptor, Message } from "../interfaces";
import {
  Dispatch,
  ForwardedRef,
  forwardRef,
  SetStateAction,
  useEffect,
  useState,
} from "react";
import { FilterManager } from "@/lib/hooks";
import { CCPairBasicInfo, DocumentSet, Tag } from "@/lib/types";
import { SourceSelector } from "../shared_chat_search/SearchFilters";
import { XIcon } from "@/components/icons/icons";
import FileSourceCard from "@/components/chat_search/sources/FileSource";

interface ChatFiltersProps {
  filterManager: FilterManager;
  closeSidebar: () => void;
  selectedMessage: Message | null;
  selectedDocuments: DanswerDocument[] | null;
  toggleDocumentSelection: (document: DanswerDocument) => void;
  clearSelectedDocuments: () => void;
  selectedDocumentTokens: number;
  maxTokens: number;
  initialWidth: number;
  isOpen: boolean;
  modal: boolean;
  ccPairs: CCPairBasicInfo[];
  tags: Tag[];
  documentSets: DocumentSet[];
  showFilters: boolean;
  setPresentingDocument: Dispatch<SetStateAction<DanswerDocument | null>>;
  selectedFiles: FileDescriptor[];
  toggledFiles?: FileDescriptor[];
}

export const ChatFilters = forwardRef<HTMLDivElement, ChatFiltersProps>(
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
      initialWidth,
      isOpen,
      ccPairs,
      tags,
      setPresentingDocument,
      selectedFiles,
      toggledFiles = [],
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

    const selectedDocumentIds = (
      selectedDocuments?.map((document) => document.document_id) || []
    ).concat(toggledFiles.map((file) => file.id));

    const currentDocuments = selectedMessage?.documents || null;
    const dedupedDocuments = removeDuplicateDocs(currentDocuments || []);

    const tokenLimitReached = selectedDocumentTokens > maxTokens - 75;

    const hasSelectedDocuments = selectedDocumentIds.length > 0;

    return (
      <div
        id="danswer-chat-sidebar"
        className={`relative py-2 max-w-full ${
          !modal ? "border-l h-full border-sidebar-border" : ""
        }`}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            closeSidebar();
          }
        }}
      >
        <div
          className={`ml-auto h-full relative sidebar transition-all duration-300 
            ${
              isOpen
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-[10%]"
            }`}
          style={{
            width: modal ? undefined : initialWidth,
          }}
        >
          <div className="flex flex-col h-full">
            {popup}
            <div className="p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-text-900">
                {showFilters ? "Filters" : "Sources"}
              </h2>
              <button
                onClick={closeSidebar}
                className="text-sm text-primary-600 mr-2  hover:text-primary-800 transition-colors duration-200 ease-in-out"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="border-b border-divider-history-sidebar-bar mx-3" />
            <div className="overflow-y-auto -mx-1 sm:mx-0 flex-grow gap-y-0 default-scrollbar dark-scrollbar flex flex-col">
              {showFilters ? (
                <SourceSelector
                  modal={modal}
                  tagsOnLeft={true}
                  filtersUntoggled={false}
                  {...filterManager}
                  availableDocumentSets={documentSets}
                  existingSources={ccPairs.map((ccPair) => ccPair.source)}
                  availableTags={tags}
                />
              ) : (
                <>
                  {dedupedDocuments.length > 0
                    ? dedupedDocuments.map((document, ind) => (
                        <div
                          key={document.document_id}
                          className={`${
                            ind === dedupedDocuments.length - 1
                              ? ""
                              : "border-b border-border-light w-full"
                          }`}
                        >
                          <ChatDocumentDisplay
                            setPresentingDocument={setPresentingDocument}
                            closeSidebar={closeSidebar}
                            modal={modal}
                            document={document}
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
                    : selectedFiles.map((file) => (
                        <ChatFileDisplay
                          file={file}
                          key={file.id}
                          closeSidebar={closeSidebar}
                          modal={modal}
                          isSelected={selectedDocumentIds.includes(file.id)}
                          handleSelect={(d: any) => toggleDocumentSelection(d)}
                          tokenLimitReached={tokenLimitReached}
                          setPresentingDocument={setPresentingDocument}
                        />
                      ))}
                </>
              )}
            </div>
          </div>
          {!showFilters && (
            <div
              className={`sticky bottom-4 w-full left-0 flex justify-center transition-opacity duration-300 ${
                hasSelectedDocuments
                  ? "opacity-100"
                  : "opacity-0 pointer-events-none"
              }`}
            >
              <button
                className="text-sm font-medium py-2 px-4 rounded-full transition-colors bg-gray-900 text-white"
                onClick={clearSelectedDocuments}
              >
                {`Remove ${
                  delayedSelectedDocumentCount > 0
                    ? delayedSelectedDocumentCount
                    : ""
                } 
                ${selectedFiles ? "Document" : "Source"}${
                  delayedSelectedDocumentCount > 1 ? "s" : ""
                }`}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
);

ChatFilters.displayName = "ChatFilters";
