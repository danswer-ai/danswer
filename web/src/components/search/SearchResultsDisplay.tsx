/* "use client";

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
  validQuestionResponse,
  isFetching,
  defaultOverrides,
  personaName = null,
}: {
  searchResponse: SearchResponse | null;
  validQuestionResponse: ValidQuestionResponse;
  isFetching: boolean;
  defaultOverrides: SearchDefaultOverrides;
  personaName?: string | null;
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
      {shouldDisplayQA && (
        <div className="min-h-[16rem] p-4 border-2 border-border rounded-regular relative">
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
      )}

      {documents && documents.length > 0 && (
        <div className="mt-4">
          <div className="font-bold text-emphasis border-b mb-3 pb-1 border-border text-lg">
            Results
          </div>
          {removeDuplicateDocs(documents).map((document, ind) => (
            <DocumentDisplay
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
    </>
  );
};*/

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
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import useSWR from "swr";
import { ConnectorIndexingStatus } from "@/lib/types";
import { errorHandlingFetcher } from "@/lib/fetcher";

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
  validQuestionResponse,
  isFetching,
  defaultOverrides,
  personaName = null,
}: {
  searchResponse: SearchResponse | null;
  validQuestionResponse: ValidQuestionResponse;
  isFetching: boolean;
  defaultOverrides: SearchDefaultOverrides;
  personaName?: string | null;
}) => {
  /*  */
  const {
    data: indexAttemptData,
    isLoading: indexAttemptIsLoading,
    error: indexAttemptError,
  } = useSWR<ConnectorIndexingStatus<any, any>[]>(
    "/api/manage/admin/connector/indexing-status",
    errorHandlingFetcher,
    { refreshInterval: 10000 } // 10 seconds
  );
  /*  */

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

  console.log(indexAttemptData);
  /*  console.log(documents![0].link); */

  return (
    <>
      {popup}
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
                validQuestionResponse.answerable === false && !isPersona
                  ? validQuestionResponse.reasoning
                  : ""
              }
              isFetching={isFetching}
            />
          </CardContent>

          {quotes !== null && answer && !isPersona && (
            <CardFooter className="p-0 border-t pt-2">
              <QuotesSection
                quotes={dedupedQuotes}
                isFetching={isFetching}
                isAnswerable={validQuestionResponse.answerable}
              />

              {searchResponse.messageId !== null && (
                <div className="absolute right-4 bottom-4">
                  <QAFeedbackBlock
                    messageId={searchResponse.messageId}
                    setPopup={setPopup}
                  />
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
                  setPopup={setPopup}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
