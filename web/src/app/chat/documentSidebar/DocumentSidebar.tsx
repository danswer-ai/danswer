import { DanswerDocument } from "@/lib/search/interfaces";
import { Divider, Text } from "@tremor/react";
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
      className={`w-full mt-3 flex text-lg text-emphasis font-medium flex mb-3.5 font-bold flex items-end`}
    >
      <div className="flex mt-auto justify-between w-full">
        <p className="flex">
          {icon({ className: "my-auto mr-1" })}
          {name}
        </p>
        {closeHeader && (
          <button onClick={() => closeHeader()}>
            <TbLayoutSidebarLeftExpand size={24} />
          </button>
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
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            closeSidebar();
          }
        }}
        className="fixed inset-0 transition transform transition-all duration-300 z-[100] bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      >
        <div
          ref={ref}
          style={{ width: initialWidth }}
          className={`ml-auto  rounded-l-lg relative border-l bg-neutral-100 sidebar z-50 absolute right-0 h-screen `}
        >
          <div className="flex-initial overflow-y-hidden flex flex-col h-screen pb-10">
            {popup}
            <div className="pl-3 mx-2 pr-6 mt-3 flex text-neutral-800 flex-col text-2xl text-emphasis flex font-semibold">
              {dedupedDocuments.length} Documents
              <p className="text-sm font-semibold flex flex-wrap gap-x-2 text-neutral-600 mt-1">
                Select to add to continuous context
                <a
                  href="https://docs.danswer.dev/introduction"
                  className="underline cursor-pointer hover:text-neutral-900"
                >
                  Learn more
                </a>
              </p>
            </div>

            <Divider className="mb-0 mt-4 pb-2" />

            {currentDocuments ? (
              <div className="overflow-y-auto flex-grow dark-scrollbar flex relative flex-col">
                <div>
                  {dedupedDocuments.length > 0 ? (
                    dedupedDocuments.map((document, ind) => (
                      <div
                        key={document.document_id}
                        className={`${
                          ind === dedupedDocuments.length - 1
                            ? "mb-5"
                            : "border-b  border-border-light mb-3"
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
                    <div className="mx-3">
                      <Text>No documents found for the query.</Text>
                    </div>
                  )}
                </div>
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
          <div className="sticky bottom-4 w-full left-0  justify-center flex gap-x-4 ">
            <button
              className=" bg-neutral-700 text-xs p-2 rounded text-neutral-200"
              onClick={() => closeSidebar()}
            >
              Save Changes
            </button>
            <button
              className=" bg-neutral-900 text-xs p-2 rounded text-neutral-200"
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
