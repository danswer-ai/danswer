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
import { ResponseSection, StatusOptions } from "./results/ResponseSection";
import { QuotesSection } from "./results/QuotesSection";
import { AnswerSection } from "./results/AnswerSection";
import {
  getAIThoughtsIsOpenSavedValue,
  setAIThoughtsIsOpenSavedValue,
} from "@/lib/search/aiThoughtUtils";
import { ThreeDots } from "react-loader-spinner";
import { usePopup } from "../admin/connectors/Popup";

const removeDuplicateDocs = (documents: DanswerDocument[]) => {
  const seen = new Set<string>();
  const output: DanswerDocument[] = [];
  documents.forEach((document) => {
    if (document.document_id && !seen.has(document.document_id)) {
      output.push(document);
      seen.add(document.document_id);
    }
  });
  return output;
};

interface SearchResultsDisplayProps {
  searchResponse: SearchResponse | null;
  validQuestionResponse: ValidQuestionResponse;
  isFetching: boolean;
  defaultOverrides: SearchDefaultOverrides;
}

export const SearchResultsDisplay: React.FC<SearchResultsDisplayProps> = ({
  searchResponse,
  validQuestionResponse,
  isFetching,
  defaultOverrides,
}) => {
  const { popup, setPopup } = usePopup();
  const [isAIThoughtsOpen, setIsAIThoughtsOpen] = React.useState<boolean>(
    getAIThoughtsIsOpenSavedValue()
  );
  const handleAIThoughtToggle = (newAIThoughtsOpenValue: boolean) => {
    setAIThoughtsIsOpenSavedValue(newAIThoughtsOpenValue);
    setIsAIThoughtsOpen(newAIThoughtsOpenValue);
  };

  if (!searchResponse) {
    return null;
  }

  const { answer, quotes, documents, error, queryEventId } = searchResponse;

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

  if (answer === null && documents === null && quotes === null) {
    return <div className="text-gray-300">No matching documents found.</div>;
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

  const shouldDisplayQA =
    searchResponse.suggestedFlowType === FlowType.QUESTION_ANSWER ||
    defaultOverrides.forceDisplayQA;

  let questionValidityCheckStatus: StatusOptions = "in-progress";
  if (validQuestionResponse.answerable) {
    questionValidityCheckStatus = "success";
  } else if (validQuestionResponse.answerable === false) {
    questionValidityCheckStatus = "failed";
  }

  return (
    <>
      {popup}
      {shouldDisplayQA && (
        <div className="min-h-[16rem] p-4 border-2 rounded-md border-gray-700 relative">
          <div>
            <div className="flex mb-1">
              <h2 className="text font-bold my-auto mb-1 w-full">AI Answer</h2>
            </div>

            <div className="mb-2 w-full">
              <ResponseSection
                status={questionValidityCheckStatus}
                header={
                  validQuestionResponse.answerable === null ? (
                    <div className="flex ml-2">Evaluating question...</div>
                  ) : (
                    <div className="flex ml-2">AI thoughts</div>
                  )
                }
                body={<div>{validQuestionResponse.reasoning}</div>}
                desiredOpenStatus={isAIThoughtsOpen}
                setDesiredOpenStatus={handleAIThoughtToggle}
              />
            </div>

            <div className="mb-2 pt-1 border-t border-gray-700 w-full">
              <AnswerSection
                answer={answer}
                quotes={quotes}
                error={error}
                isAnswerable={validQuestionResponse.answerable}
                isFetching={isFetching}
                aiThoughtsIsOpen={isAIThoughtsOpen}
              />
            </div>

            {quotes !== null && answer && (
              <div className="pt-1 border-t border-gray-700 w-full">
                <QuotesSection
                  quotes={dedupedQuotes}
                  isFetching={isFetching}
                  isAnswerable={validQuestionResponse.answerable}
                />

                {searchResponse.queryEventId !== null && (
                  <div className="absolute right-3 bottom-3">
                    <QAFeedbackBlock
                      queryId={searchResponse.queryEventId}
                      setPopup={setPopup}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {documents && documents.length > 0 && (
        <div className="mt-4">
          <div className="font-bold border-b mb-3 pb-1 border-gray-800 text-lg">
            Results
          </div>
          {removeDuplicateDocs(documents).map((document) => (
            <DocumentDisplay
              key={document.document_id}
              document={document}
              queryEventId={queryEventId}
              setPopup={setPopup}
            />
          ))}
        </div>
      )}
    </>
  );
};
