"use client";

import React from "react";
import {
  DanswerDocument,
  SearchResponse,
  Quote,
  FlowType,
  SearchDefaultOverrides,
  ValidQuestionResponse,
} from "@/lib/search/interfaces";
import { QAFeedbackBlock } from "./QAFeedback";
import { DocumentDisplay } from "./DocumentDisplay";
import { QuotesSection } from "./results/QuotesSection";
import { AnswerSection } from "./results/AnswerSection";
import { ThreeDots } from "react-loader-spinner";
import { usePopup } from "../admin/connectors/Popup";
import { AlertIcon } from "../icons/icons";
import { removeDuplicateDocs } from "@/lib/documentUtils";
import { searchState } from "./SearchSection";

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
}: {
  searchState: searchState;
  searchResponse: SearchResponse | null;
  validQuestionResponse: ValidQuestionResponse;
  isFetching: boolean;
  defaultOverrides: SearchDefaultOverrides;
  personaName?: string | null;
  relevance: any;
}) => {
  const { popup, setPopup } = usePopup();

  if (!searchResponse) {
    return null;
  }

  const isPersona = personaName !== null;
  const { answer, quotes, documents, error, messageId } = searchResponse;

  if (isFetching && !answer && !documents) {
    return (
      <div className="flex">
        <div className="mx-auto">
          <ThreeDots
            height="30"
            width="40"
            color="#3b82f6"
            ariaLabel="grid-loading"
            radius="12.5"
            wrapperStyle={{}}
            wrapperClass=""
            visible={true}
          />
        </div>
      </div>
    );
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

      {documents && documents.length > 0 && (
        <div className="mt-4">
          <div className="font-bold text-emphasis border-b mb-3 pb-1 border-border text-lg">
            Results
          </div>
          {removeDuplicateDocs(documents).map((document, ind) => (
            <DocumentDisplay
              relevance={relevance}
              key={document.document_id}
              document={document}
              documentRank={ind + 1}
              messageId={messageId}
              isSelected={selectedDocumentIds.has(document.document_id)}
              setPopup={setPopup}
            />
          ))}
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
