import { EnmeddDocument } from "@/lib/search/interfaces";
import { ChatDocumentDisplay } from "./ChatDocumentDisplay";
import { removeDuplicateDocs } from "@/lib/documentUtils";
import { Message, RetrievalType } from "../interfaces";
import { ForwardedRef, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { FileText, PanelRightClose } from "lucide-react";

function SectionHeader({
  name,
  icon,
  closeHeader,
}: {
  name: string;
  icon?: boolean;
  closeHeader?: () => void;
}) {
  return (
    <div className="flex justify-between w-full mt-auto items-center py-[26px] pb-6 text-lg font-medium border-b border-border">
      <p className="flex truncate text-dark-900">
        {icon && <FileText size={22} className="my-auto mr-2" />}
        {name}
      </p>
      {closeHeader && (
        <Button
          onClick={() => closeHeader()}
          variant="ghost"
          size="icon"
          className="flex xl:hidden"
        >
          <PanelRightClose size={24} />
        </Button>
      )}
    </div>
  );
}

interface DocumentSidebarProps {
  closeSidebar: () => void;
  selectedMessage: Message | null;
  selectedDocuments: EnmeddDocument[] | null;
  toggleDocumentSelection: (document: EnmeddDocument) => void;
  clearSelectedDocuments: () => void;
  selectedDocumentTokens: number;
  maxTokens: number;
  isLoading: boolean;
  initialWidth: number;
  showDocSidebar?: boolean;
  isWide?: boolean;
}

export const DocumentSidebar = forwardRef<HTMLDivElement, DocumentSidebarProps>(
  (
    {
      closeSidebar,
      selectedMessage,
      selectedDocuments,
      toggleDocumentSelection,
      clearSelectedDocuments,
      selectedDocumentTokens,
      maxTokens,
      isLoading,
      initialWidth,
      showDocSidebar,
      isWide,
    },
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    const selectedMessageRetrievalType = selectedMessage?.retrievalType || null;

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

    return (
      <div
        ref={ref}
        className={`sidebar absolute right-0 h-screen border-l border-l-border w-full`}
      >
        <div className="flex flex-col flex-initial w-full h-screen overflow-y-hidden">
          <div
            className={`flex flex-col h-full ${
              !showDocSidebar
                ? "opacity-0 duration-100"
                : "opacity-100 duration-500 delay-300"
            }`}
          >
            <div className="flex px-6">
              <SectionHeader
                name={
                  selectedMessageRetrievalType === RetrievalType.SelectedDocs
                    ? "Referenced Documents"
                    : "Retrieved Sources"
                }
                icon
                closeHeader={closeSidebar}
              />
            </div>
            {currentDocuments ? (
              <div className="flex flex-col overflow-y-auto dark-scrollbar p-6 pb-0">
                <div>
                  {dedupedDocuments.length > 0 ? (
                    dedupedDocuments.map((document, ind) => (
                      <div
                        key={document.document_id}
                        className={`${
                          ind === dedupedDocuments.length - 1 ? "mb-5" : "mb-3"
                        }`}
                      >
                        <ChatDocumentDisplay
                          document={document}
                          queryEventId={null}
                          isAIPick={false}
                          isSelected={selectedDocumentIds.includes(
                            document.document_id
                          )}
                          handleSelect={(documentId) => {
                            toggleDocumentSelection(
                              dedupedDocuments.find(
                                (document) =>
                                  document.document_id === documentId
                              )!
                            );
                          }}
                          tokenLimitReached={tokenLimitReached}
                        />
                      </div>
                    ))
                  ) : (
                    <div>
                      <p>No documents found for the query.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              !isLoading && (
                <div className="p-6">
                  <p>
                    When you run ask a question, the retrieved documents will
                    show up here!
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    );
  }
);

DocumentSidebar.displayName = "DocumentSidebar";
