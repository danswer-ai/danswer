"use client";

import React from "react";
import {
  EnmeddDocument,
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
import { AlertIcon } from "../icons/icons";
import { removeDuplicateDocs } from "@/lib/documentUtils";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import useSWR from "swr";
import { ConnectorIndexingStatus } from "@/lib/types";
import { errorHandlingFetcher } from "@/lib/fetcher";

const getSelectedDocumentIds = (
  documents: EnmeddDocument[],
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
  validQuestionResponse,
  isFetching,
  defaultOverrides,
  assistantName = null,
}: {
  searchResponse: SearchResponse | null;
  validQuestionResponse: ValidQuestionResponse;
  isFetching: boolean;
  defaultOverrides: SearchDefaultOverrides;
  assistantName?: string | null;
}) => {
  const {
    data: indexAttemptData,
    isLoading: indexAttemptIsLoading,
    error: indexAttemptError,
  } = useSWR<ConnectorIndexingStatus<any, any>[]>(
    "/api/manage/admin/connector/indexing-status",
    errorHandlingFetcher,
    { refreshInterval: 10000 } // 10 seconds
  );

  if (!searchResponse) {
    return null;
  }

  const isAssistant = assistantName !== null;
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
    <div className="px-2">
      {shouldDisplayQA && (
        <Card className="p-4 relative">
          <CardHeader className="border-b p-0 pb-4">
            <h2 className="text-dark-900 font-bold">AI Answer</h2>
          </CardHeader>

          <CardContent className="px-0 py-2">
            <AnswerSection
              answer={answer}
              quotes={quotes}
              error={error}
              nonAnswerableReason={
                validQuestionResponse.answerable === false && !isAssistant
                  ? validQuestionResponse.reasoning
                  : ""
              }
              isFetching={isFetching}
            />
          </CardContent>

          {quotes !== null && answer && !isAssistant && (
            <CardFooter className="p-0 border-t pt-2">
              <QuotesSection
                quotes={dedupedQuotes}
                isFetching={isFetching}
                isAnswerable={validQuestionResponse.answerable}
              />

              {searchResponse.messageId !== null && (
                <div className="absolute right-4 bottom-4">
                  <QAFeedbackBlock messageId={searchResponse.messageId} />
                </div>
              )}
            </CardFooter>
          )}
        </Card>
      )}

      {documents && documents.length > 0 && (
        <div className="h-full">
          <div className="font-bold text-dark-900 border-b py-2.5 px-4 border-border text-lg">
            Results
          </div>
          <div className="h-full">
            {removeDuplicateDocs(documents).map((document, ind) => (
              <div
                key={document.document_id}
                className={
                  ind === removeDuplicateDocs(documents).length - 1
                    ? "pb-20"
                    : ""
                }
              >
                <DocumentDisplay
                  document={document}
                  documentRank={ind + 1}
                  messageId={messageId}
                  isSelected={selectedDocumentIds.has(document.document_id)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; */
