import React from "react";
import { getSourceIcon } from "../source";
import { LoadingAnimation } from "../Loading";
import { InfoIcon } from "../icons/icons";
import {
  DanswerDocument,
  SearchResponse,
  Quote,
  FlowType,
  SearchDefaultOverrides,
} from "@/lib/search/interfaces";
import { QAFeedbackBlock } from "./QAFeedback";
import { DocumentDisplay } from "./DocumentDisplay";

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
  isFetching: boolean;
  defaultOverrides: SearchDefaultOverrides;
}

export const SearchResultsDisplay: React.FC<SearchResultsDisplayProps> = ({
  searchResponse,
  isFetching,
  defaultOverrides,
}) => {
  if (!searchResponse) {
    return null;
  }

  const { answer, quotes, documents, error } = searchResponse;

  if (isFetching && !answer && !documents) {
    return (
      <div className="flex">
        <div className="mx-auto">
          <LoadingAnimation />
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

  let answerDisplay = <LoadingAnimation text="" size="text-sm" />;
  if (error) {
    answerDisplay = (
      <div className="flex">
        <InfoIcon
          size={20}
          className="text-red-500 my-auto flex flex-shrink-0"
        />
        <div className="text-red-500 text-sm my-auto ml-1">{error}</div>
      </div>
    );
  } else if (answer) {
    answerDisplay = <p className="mb-4">{answer}</p>;
  } else if (!isFetching) {
    answerDisplay = (
      <div className="text-sm my-auto text-gray-300">Information not found</div>
    );
  }

  return (
    <>
      {shouldDisplayQA && (
        <div className="min-h-[14rem]">
          <div className="p-4 border-2 rounded-md border-gray-700">
            <div className="flex mb-1">
              <h2 className="text font-bold my-auto">AI Answer</h2>
            </div>
            {answerDisplay}

            {quotes !== null && answer && (
              <>
                <h2 className="text-sm font-bold mb-2">Sources</h2>
                {isFetching && dedupedQuotes.length === 0 ? (
                  <LoadingAnimation text="Finding quotes" size="text-sm" />
                ) : (
                  <div className="flex">
                    {dedupedQuotes.length > 0 ? (
                      dedupedQuotes.map((quoteInfo) => (
                        <a
                          key={quoteInfo.document_id}
                          className="p-2 ml-1 border border-gray-800 rounded-lg text-sm flex max-w-[280px] hover:bg-gray-800"
                          href={quoteInfo.link || undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {getSourceIcon(quoteInfo.source_type, 20)}
                          <p className="truncate break-all ml-2">
                            {quoteInfo.semantic_identifier ||
                              quoteInfo.document_id}
                          </p>
                        </a>
                      ))
                    ) : (
                      <div className="flex">
                        <InfoIcon
                          size={20}
                          className="text-red-500 my-auto flex flex-shrink-0"
                        />
                        <div className="text-red-500 text-sm my-auto ml-1">
                          Did not find any exact quotes to support the above
                          answer.
                        </div>
                      </div>
                    )}

                    <div className="ml-auto mt-auto">
                      <QAFeedbackBlock queryId={1} />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {documents && documents.length > 0 && (
        <div className="mt-4">
          <div className="font-bold border-b mb-4 pb-1 border-gray-800">
            Results
          </div>
          {removeDuplicateDocs(documents).map((document) => (
            <DocumentDisplay document={document} />
          ))}
        </div>
      )}
    </>
  );
};
