import { DanswerDocument } from "@/lib/search/interfaces";
import { Text } from "@tremor/react";
import { ChatDocumentDisplay } from "./ChatDocumentDisplay";
import { usePopup } from "@/components/admin/connectors/Popup";
import { FiAlertTriangle, FiFileText } from "react-icons/fi";
import { SelectedDocumentDisplay } from "./SelectedDocumentDisplay";
import { removeDuplicateDocs } from "@/lib/documentUtils";
import { BasicSelectable } from "@/components/BasicClickable";
import { Message, RetrievalType } from "../interfaces";
import { SIDEBAR_WIDTH } from "@/lib/constants";
import { HoverPopup } from "@/components/HoverPopup";
import { TbLayoutSidebarLeftExpand } from "react-icons/tb";
import { ForwardedRef, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { PanelRightClose } from "lucide-react";

function SectionHeader({
  name,
  icon,
  closeHeader,
}: {
  name: string;
  icon: React.FC<{ className: string }>;
  closeHeader?: () => void;
}) {
  return (
    <div
      className={`w-full pt-3 flex text-lg font-medium items-end border-b border-border`}
    >
      <div className="flex justify-between w-full mt-auto items-center pb-3.5">
        <p className="flex truncate text-dark-900">
          {icon({ className: "my-auto mr-1" })}
          {name}
        </p>
        {closeHeader && (
          <Button onClick={() => closeHeader()} variant="ghost" size="icon">
            <PanelRightClose size={24} />
          </Button>
        )}
      </div>
    </div>
  );
}

interface DocumentSidebarProps {
  closeSidebar: () => void;
  selectedMessage: Message | null;
  selectedDocuments: DanswerDocument[] | null;
  toggleDocumentSelection: (document: DanswerDocument) => void;
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
    const { popup, setPopup } = usePopup();

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
          {popup}

          <div
            /* className={`flex flex-col h-full ${
              isWide
                ? showDocSidebar
                  ? "opacity-100 duration-700 delay-300"
                  : "opacity-0 duration-100"
                : showDocSidebar
                ? "opacity-0 duration-100"
                : "opacity-100 duration-500 delay-300"
            }`} */
            className={`flex flex-col h-full ${
              showDocSidebar
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
                icon={FiFileText}
                closeHeader={closeSidebar}
              />
            </div>

            {currentDocuments ? (
              <div className="flex flex-col overflow-y-auto dark-scrollbar p-6 pb-0 mb-6">
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
                          setPopup={setPopup}
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
                      <Text>No documents found for the query.</Text>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              !isLoading && (
                <div className="p-6">
                  <Text>
                    When you run ask a question, the retrieved documents will
                    show up here!
                  </Text>
                </div>
              )
            )}
          </div>

          {/* <div className="flex flex-col pt-4 mb-4 overflow-y-hidden text-sm border-t border-border">
            <div className="flex border-b border-border">
              <div className="flex">
                <SectionHeader name="Selected Documents" icon={FiFileText} />
                {tokenLimitReached && (
                  <div className="my-auto ml-2">
                    <div className="mb-2">
                      <HoverPopup
                        mainContent={
                          <FiAlertTriangle
                            className="my-auto text-alert"
                            size="16"
                          />
                        }
                        popupContent={
                          <Text className="w-40">
                            Over LLM context length by:{" "}
                            <i>{selectedDocumentTokens - maxTokens} tokens</i>
                            <br />
                            <br />
                            {selectedDocuments &&
                              selectedDocuments.length > 0 && (
                                <>
                                  Truncating: &quot;
                                  <i>
                                    {
                                      selectedDocuments[
                                        selectedDocuments.length - 1
                                      ].semantic_identifier
                                    }
                                  </i>
                                  &quot;
                                </>
                              )}
                          </Text>
                        }
                        direction="left"
                      />
                    </div>
                  </div>
                )}
              </div>
              {selectedDocuments && selectedDocuments.length > 0 && (
                <div
                  className="my-auto ml-auto"
                  onClick={clearSelectedDocuments}
                >
                  <BasicSelectable selected={false}>
                    De-Select All
                  </BasicSelectable>
                </div>
              )}
            </div>

            {selectedDocuments && selectedDocuments.length > 0 ? (
              <div className="flex flex-col max-h-full px-3 py-3 overflow-y-auto gap-y-2 dark-scrollbar">
                {selectedDocuments.map((document) => (
                  <SelectedDocumentDisplay
                    key={document.document_id}
                    document={document}
                    handleDeselect={(documentId) => {
                      toggleDocumentSelection(
                        dedupedDocuments.find(
                          (document) => document.document_id === documentId
                        )!
                      );
                    }}
                  />
                ))}
              </div>
            ) : (
              !isLoading && (
                <Text className="py-3">
                  Select documents from the retrieved documents section to chat
                  specifically with them!
                </Text>
              )
            )}
          </div> */}
        </div>
      </div>
    );
  }
);

DocumentSidebar.displayName = "DocumentSidebar";
