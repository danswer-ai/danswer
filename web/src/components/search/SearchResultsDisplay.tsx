import React from "react";
import { Quote, Document } from "./types";
import { getSourceIcon } from "../source";
import { LoadingAnimation } from "../Loading";

const removeDuplicateDocs = (documents: Document[]) => {
  const seen = new Set<string>();
  const output: Document[] = [];
  documents.forEach((document) => {
    if (
      document.semantic_identifier &&
      !seen.has(document.semantic_identifier)
    ) {
      output.push(document);
      seen.add(document.semantic_identifier);
    }
  });
  return output;
};

interface SearchResultsDisplayProps {
  answer: string | null;
  quotes: Record<string, Quote> | null;
  documents: Document[] | null;
  isFetching: boolean;
}

export const SearchResultsDisplay: React.FC<SearchResultsDisplayProps> = ({
  answer,
  quotes,
  documents,
  isFetching,
}) => {
  if (!answer) {
    if (isFetching) {
      return (
        <div className="flex">
          <div className="mx-auto">
            <LoadingAnimation />
          </div>
        </div>
      );
    }
    return null;
  }

  if (answer === null) {
    return <div>Unable to find an answer</div>;
  }

  const dedupedQuotes: Quote[] = [];
  const seen = new Set<string>();
  if (quotes) {
    Object.values(quotes).forEach((quote) => {
      if (!seen.has(quote.document_id)) {
        dedupedQuotes.push(quote);
        seen.add(quote.document_id);
      }
    });
  }

  return (
    <>
      <div className="p-4 border-2 rounded-md border-gray-700">
        <div className="flex mb-1">
          <h2 className="text font-bold my-auto">AI Answer</h2>
        </div>
        <p className="mb-4">{answer}</p>

        {quotes !== null && (
          <>
            <h2 className="text-sm font-bold mb-2">Sources</h2>
            {isFetching && dedupedQuotes.length === 0 ? (
              <LoadingAnimation text="Finding quotes" size="text-sm" />
            ) : (
              <div className="flex">
                {dedupedQuotes.map((quoteInfo) => (
                  <a
                    key={quoteInfo.document_id}
                    className="p-2 ml-1 border border-gray-800 rounded-lg text-sm flex max-w-[230px] hover:bg-gray-800"
                    href={quoteInfo.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {getSourceIcon(quoteInfo.source_type, "20")}
                    <p className="truncate break-all ml-0.5">
                      {quoteInfo.semantic_identifier || quoteInfo.document_id}
                    </p>
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {/* Only display docs once we're done fetching to avoid distracting from the AI answer*/}
      {!isFetching && documents && documents.length > 0 && (
        <div className="mt-4">
          <div className="font-bold border-b mb-4 pb-1 border-gray-800">
            Results
          </div>
          {removeDuplicateDocs(documents)
            .slice(0, 7)
            .map((doc) => (
              <div
                key={doc.document_id}
                className="text-sm border-b border-gray-800 mb-3"
              >
                <a
                  className="rounded-lg flex font-bold"
                  href={doc.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {getSourceIcon(doc.source_type, "20")}
                  <p className="truncate break-all ml-0.5">
                    {doc.semantic_identifier || doc.document_id}
                  </p>
                </a>
                <p className="pl-1 py-3 text-gray-200">{doc.blurb}</p>
              </div>
            ))}
        </div>
      )}
    </>
  );
};
