import { DanswerDocument } from "@/lib/search/interfaces";
import { Text } from "@tremor/react";
import { ChatDocumentDisplay } from "./ChatDocumentDisplay";
import { usePopup } from "@/components/admin/connectors/Popup";
import { FiFileText } from "react-icons/fi";
import { SelectedDocumentDisplay } from "./SelectedDocumentDisplay";
import { removeDuplicateDocs } from "@/lib/documentUtils";
import { BasicSelectable } from "@/components/BasicClickable";
import { Message, RetrievalType } from "../interfaces";
import { HEADER_PADDING } from "@/lib/constants";

function SectionHeader({
  name,
  icon,
}: {
  name: string;
  icon: React.FC<{ className: string }>;
}) {
  return (
    <div className="text-lg text-emphasis font-medium flex pb-0.5 mb-3.5 mt-2 font-bold">
      {icon({ className: "my-auto mr-1" })}
      {name}
    </div>
  );
}

export function DocumentSidebar({
  selectedMessage,
  selectedDocuments,
  setSelectedDocuments,
  isLoading,
}: {
  selectedMessage: Message | null;
  selectedDocuments: DanswerDocument[] | null;
  setSelectedDocuments: (documents: DanswerDocument[]) => void;
  isLoading: boolean;
}) {
  const { popup, setPopup } = usePopup();

  const selectedMessageRetrievalType = selectedMessage?.retrievalType || null;

  const selectedDocumentIds =
    selectedDocuments?.map((document) => document.document_id) || [];

  const currentDocuments = selectedMessage?.documents || null;
  const dedupedDocuments = removeDuplicateDocs(currentDocuments || []);
  return (
    <div
      className={`
      flex-initial 
      overflow-y-hidden
      flex
      flex-col
      w-full
      h-screen
      ${HEADER_PADDING}
      `}
      id="document-sidebar"
    >
      {popup}

      <div className="h-4/6 flex flex-col mt-4">
        <div className="px-3 mb-3 flex border-b border-border">
          <SectionHeader
            name={
              selectedMessageRetrievalType === RetrievalType.SelectedDocs
                ? "Referenced Documents"
                : "Retrieved Documents"
            }
            icon={FiFileText}
          />
        </div>

        {currentDocuments ? (
          <div className="overflow-y-auto dark-scrollbar overflow-x-hidden flex flex-col">
            <div>
              {dedupedDocuments.length > 0 ? (
                dedupedDocuments.map((document, ind) => (
                  <div
                    key={document.document_id}
                    className={
                      ind === dedupedDocuments.length - 1
                        ? "mb-5"
                        : "border-b border-border-light mb-3"
                    }
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
                        if (selectedDocumentIds.includes(documentId)) {
                          setSelectedDocuments(
                            selectedDocuments!.filter(
                              (document) => document.document_id !== documentId
                            )
                          );
                        } else {
                          setSelectedDocuments([
                            ...selectedDocuments!,
                            currentDocuments.find(
                              (document) => document.document_id === documentId
                            )!,
                          ]);
                        }
                      }}
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
                When you run ask a question, the retrieved documents will show
                up here!
              </Text>
            </div>
          )
        )}
      </div>

      <div className="text-sm mb-4 border-t border-border pt-4 overflow-y-hidden flex flex-col">
        <div className="flex border-b border-border px-3">
          <div>
            <SectionHeader name="Selected Documents" icon={FiFileText} />
          </div>

          {selectedDocuments && selectedDocuments.length > 0 && (
            <div
              className="ml-auto my-auto"
              onClick={() => setSelectedDocuments([])}
            >
              <BasicSelectable selected={false}>De-Select All</BasicSelectable>
            </div>
          )}
        </div>

        {selectedDocuments && selectedDocuments.length > 0 ? (
          <div className="flex flex-col gap-y-2 py-3 px-3 overflow-y-auto dark-scrollbar max-h-full">
            {selectedDocuments.map((document) => (
              <SelectedDocumentDisplay
                key={document.document_id}
                document={document}
                handleDeselect={(documentId) => {
                  setSelectedDocuments(
                    selectedDocuments!.filter(
                      (document) => document.document_id !== documentId
                    )
                  );
                }}
              />
            ))}
          </div>
        ) : (
          !isLoading && (
            <Text className="mx-3 py-3">
              Select documents from the retrieved documents section to chat
              specifically with them!
            </Text>
          )
        )}
      </div>
    </div>
  );
}
