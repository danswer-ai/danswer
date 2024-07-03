"use client";

import { removeDuplicateDocs } from "@/lib/documentUtils";
import {
  DanswerDocument,
  FlowType,
  Quote,
  SearchDefaultOverrides,
  SearchResponse,
  ValidQuestionResponse,
} from "@/lib/search/interfaces";
import { usePopup } from "../admin/connectors/Popup";
import { AlertIcon } from "../icons/icons";
import { DocumentDisplay } from "./DocumentDisplay";
import { searchState } from "./SearchSection";
import { useEffect, useState } from "react";

const getSelectedDocumentIds = (
  documents: DanswerDocument[],
  selectedIndices: number[]
) => {
  const selectedDocumentIds = new Set<string>();
  selectedIndices.forEach((ind) => {
    selectedDocumentIds.add(documents[ind].document_id);
  });
  return selectedDocumentIds;
};

export const SearchResultsDisplay = ({
  searchResponse,
  searchState,
  validQuestionResponse,
  isFetching,
  defaultOverrides,
  personaName = null,
  relevance,
  performSweep,
  sweep,
}: {
  performSweep: () => void;
  sweep?: boolean;
  searchState: searchState;
  searchResponse: SearchResponse | null;
  validQuestionResponse: ValidQuestionResponse;
  isFetching: boolean;
  defaultOverrides: SearchDefaultOverrides;
  personaName?: string | null;
  relevance: any;
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        switch (event.key.toLowerCase()) {
          case "o":
            event.preventDefault();
            // if (relevance!=null) {
            performSweep();
            // }
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const { popup, setPopup } = usePopup();

  if (!searchResponse) {
    return null;
  }

  const { answer, quotes, documents, error, messageId } = searchResponse;

  if (isFetching && !answer && !documents) {
    return null;
  }

  if (
    answer === null &&
    (documents === null || documents.length === 0) &&
    quotes === null &&
    !isFetching
  ) {
    return (
      <div className="mt-4">
        {error ? (
          <div className="text-error text-sm">
            <div className="flex">
              <AlertIcon size={16} className="text-error my-auto mr-1" />
              <p className="italic">{error}</p>
            </div>
          </div>
        ) : (
          <div className="text-subtle">No matching documents found.</div>
        )}
      </div>
    );
  }

  const dedupedQuotes: Quote[] = [];
  const seen = new Set<string>();
  if (quotes) {
    quotes.forEach((quote) => {
      if (!seen.has(quote.document_id)) {
        dedupedQuotes.push(quote);
        seen.add(quote.document_id);
      }
    });
  }

  const selectedDocumentIds = getSelectedDocumentIds(
    documents || [],
    searchResponse.selectedDocIndices || []
  );

  const shouldDisplayQA =
    searchResponse.suggestedFlowType === FlowType.QUESTION_ANSWER ||
    defaultOverrides.forceDisplayQA;

  return (
    <>
      {popup}
      {/* {shouldDisplayQA && (
        <div className="min-h-[16rem] p-4 border-2 border-border rounded-lg relative">
          <div>
            <div className="flex mb-1">
              <h2 className="text-emphasis font-bold my-auto mb-1 w-full">
                AI Answer
              </h2>
            </div>

            <div className="mb-2 pt-1 border-t border-border w-full">
              <AnswerSection
                answer={answer}
                quotes={quotes}
                error={error}
                nonAnswerableReason={
                  validQuestionResponse.answerable === false && !isPersona
                    ? validQuestionResponse.reasoning
                    : ""
                }
                isFetching={isFetching}
              />
            </div>

            {quotes !== null && answer && !isPersona && (
              <div className="pt-1 border-t border-border w-full">
                <QuotesSection
                  quotes={dedupedQuotes}
                  isFetching={isFetching}
                  isAnswerable={validQuestionResponse.answerable}
                />

                {searchResponse.messageId !== null && (
                  <div className="absolute right-3 bottom-3">
                    <QAFeedbackBlock
                      messageId={searchResponse.messageId}
                      setPopup={setPopup}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )} */}
      {/* {documents && documents.length > 0 && (
        <AnimatedDocumentList
          documents={documents}
          messageId={messageId}
          selectedDocumentIds={selectedDocumentIds}
          setPopup={setPopup}
          relevance={relevance}
        />
      )} */}
      {documents && documents.length > 0 && (
        <div className="mt-4">
          <div className="font-bold flex justify-between text-emphasis border-b mb-3 pb-1 border-border text-lg">
            <p>Results</p>
            {relevance && (
              <button
                onClick={() => performSweep()}
                className={`flex items-center justify-center animate-fade-in-up rounded-lg p-1 text-xs transition-all duration-300 w-16 h-8 ${
                  !sweep
                    ? "bg-green-500 text-neutral-800"
                    : "bg-rose-700 text-neutral-100"
                }`}
                style={{
                  transform: !sweep ? "rotateZ(180deg)" : "rotateZ(0deg)",
                }}
              >
                <div
                  className={`flex items-center ${!sweep ? "rotate-180" : ""}`}
                >
                  {/* {!sweep ? "Clean" : "Show"} */}

                  <span>⌘O</span>

                  {!sweep ? (
                    <svg
                      className="h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      width="200"
                      height="200"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill="currentColor"
                        d="M18.221 19.643c.477-.903.942-1.937 1.24-2.98c.411-1.438.56-2.788.602-3.818l-1.552-1.552l-5.804-5.804l-1.552-1.552c-1.03.042-2.38.19-3.817.602c-1.045.298-2.078.763-2.981 1.24C2.1 6.97 1.427 9.71 2.497 11.807l.013.025l.7 1.15a23.338 23.338 0 0 0 7.808 7.809l1.15.699l.025.013c2.096 1.07 4.837.396 6.028-1.86Zm3.554-16.33a.77.77 0 0 0-1.088-1.088L19.012 3.9a4.877 4.877 0 0 0-5.718 0l1.109 1.109l4.588 4.588l1.109 1.109a4.877 4.877 0 0 0 0-5.718l1.675-1.675Z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      width="200"
                      height="200"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill="currentColor"
                        fill-rule="evenodd"
                        d="M3.464 3.464C2 4.93 2 7.286 2 12c0 4.714 0 7.071 1.464 8.535C4.93 22 7.286 22 12 22c4.714 0 7.071 0 8.535-1.465C22 19.072 22 16.715 22 12c0-4.714 0-7.071-1.465-8.536C19.072 2 16.714 2 12 2S4.929 2 3.464 3.464Zm5.795 4.51A.75.75 0 1 0 8.24 6.872L5.99 8.949a.75.75 0 0 0 0 1.102l2.25 2.077a.75.75 0 1 0 1.018-1.102l-.84-.776h5.62c.699 0 1.168 0 1.526.036c.347.034.507.095.614.164c.148.096.275.223.37.371c.07.106.13.267.165.614c.035.358.036.827.036 1.526c0 .7 0 1.169-.036 1.527c-.035.346-.095.507-.164.614a1.25 1.25 0 0 1-.371.37c-.107.07-.267.13-.614.165c-.358.035-.827.036-1.526.036H9.5a.75.75 0 1 0 0 1.5h4.576c.652 0 1.196 0 1.637-.044c.462-.046.89-.145 1.28-.397c.327-.211.605-.49.816-.816c.252-.39.351-.818.397-1.28c.044-.441.044-.985.044-1.637v-.075c0-.652 0-1.196-.044-1.637c-.046-.462-.145-.891-.397-1.28a2.748 2.748 0 0 0-.816-.817c-.39-.251-.818-.35-1.28-.396c-.44-.044-.985-.044-1.637-.044H8.418l.84-.776Z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </button>
            )}
          </div>
          {removeDuplicateDocs(documents).map(
            (document, ind) => {
              // if (!relevance || (relevance && (!sweep || (sweep && relevance[document.document_id])))) {

              return (
                <DocumentDisplay
                  hide={sweep && relevance && !relevance[document.document_id]}
                  sweep={sweep!}
                  relevance={relevance}
                  key={document.document_id}
                  document={document}
                  documentRank={ind + 1}
                  messageId={messageId}
                  isSelected={selectedDocumentIds.has(document.document_id)}
                  setPopup={setPopup}
                />
              );
            }
            // }
          )}
        </div>
      )}
      <div
        className={`flex mt-4 justify-center transition-all duration-500 ${searchState == "input" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      >
        <button className="duration-300 transition-bg cursor-pointer z-[100] hover:bg-neutral-700 bg-neutral-800 text-neutral-200 h-8 rounded-md px-3 text-xs">
          Analyze 20 more
        </button>
        <button className=" pl-5 transition-all cursor-pointer -ml-2 bg-neutral-200 text-neutral-600 h-8 my-auto rounded-r-md rounded-t-md rounded-b-md px-3 text-xs">
          <p className=" relative after:bg-neutral-600 after:absolute after:h-[1px] after:w-0 after:bottom-0 after:left-0 hover:after:w-full after:transition-all after:duration-300 duration-300">
            Show me all
          </p>
        </button>
      </div>
    </>
  );
};
