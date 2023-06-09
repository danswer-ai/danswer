import React from "react";
import { getSourceIcon } from "../source";
import { LoadingAnimation } from "../Loading";
import { InfoIcon } from "../icons/icons";
import {
  DanswerDocument,
  SearchResponse,
  Quote,
} from "@/lib/search/interfaces";
import { SearchType } from "./SearchTypeSelector";

const removeDuplicateDocs = (documents: DanswerDocument[]) => {
  const seen = new Set<string>();
  const output: DanswerDocument[] = [];
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
  searchResponse: SearchResponse | null;
  isFetching: boolean;
}

export const SearchResultsDisplay: React.FC<SearchResultsDisplayProps> = ({
  searchResponse,
  isFetching,
}) => {
  if (!searchResponse) {
    return null;
  }

  const { answer, quotes, documents } = searchResponse;

  if (isFetching && !answer) {
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
    Object.values(quotes).forEach((quote) => {
      if (!seen.has(quote.document_id)) {
        dedupedQuotes.push(quote);
        seen.add(quote.document_id);
      }
    });
  }

  return (
    <>
      {answer && (
        <div className="h-56">
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
                        className="p-2 ml-1 border border-gray-800 rounded-lg text-sm flex max-w-[280px] hover:bg-gray-800"
                        href={quoteInfo.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {getSourceIcon(quoteInfo.source_type, "20")}
                        <p className="truncate break-all ml-2">
                          {quoteInfo.semantic_identifier ||
                            quoteInfo.document_id}
                        </p>
                      </a>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {!answer &&
        !isFetching &&
        searchResponse.searchType === SearchType.SEMANTIC && (
          <div className="flex">
            <InfoIcon
              size="20"
              className="text-red-500 my-auto flex flex-shrink-0"
            />
            <div className="text-red-500 text-xs my-auto ml-1">
              GPT hurt itself in its confusion :(
            </div>
          </div>
        )}

      {documents && documents.length > 0 && (
        <div className="mt-4">
          <div className="font-bold border-b mb-4 pb-1 border-gray-800">
            Results
          </div>
          {removeDuplicateDocs(documents)
            .slice(0, 7)
            .map((doc) => (
              <div
                key={doc.semantic_identifier}
                className="text-sm border-b border-gray-800 mb-3"
              >
                <a
                  className={
                    "rounded-lg flex font-bold " +
                    (doc.link ? "" : "pointer-events-none")
                  }
                  href={doc.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {getSourceIcon(doc.source_type, "20")}
                  <p className="truncate break-all ml-2">
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
