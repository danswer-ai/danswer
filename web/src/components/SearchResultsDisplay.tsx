import React from "react";
import { Globe, SlackLogo, GoogleDriveLogo } from "@phosphor-icons/react";
import "tailwindcss/tailwind.css";
import { Quote, SearchResponse } from "./types";
import { ThinkingAnimation } from "./Thinking";

interface SearchResultsDisplayProps {
  data: SearchResponse | undefined;
  isFetching: boolean;
}

const ICON_SIZE = "20";
const ICON_STYLE = "text-blue-600 my-auto mr-1 flex flex-shrink-0";

const getSourceIcon = (sourceType: string) => {
  switch (sourceType) {
    case "web":
      return <Globe size={ICON_SIZE} className={ICON_STYLE} />;
    case "slack":
      return <SlackLogo size={ICON_SIZE} className={ICON_STYLE} />;
    case "google_drive":
      return <GoogleDriveLogo size={ICON_SIZE} className={ICON_STYLE} />;
    default:
      return null;
  }
};

export const SearchResultsDisplay: React.FC<SearchResultsDisplayProps> = ({
  data,
  isFetching,
}) => {
  if (isFetching) {
    return <ThinkingAnimation />;
  }

  if (!data) {
    return null;
  }

  const { answer, quotes } = data;
  if (!answer || !quotes) {
    return <div>Unable to find an answer</div>;
  }

  const dedupedQuotes: Quote[] = [];
  const seen = new Set<string>();
  Object.values(quotes).forEach((quote) => {
    if (!seen.has(quote.document_id)) {
      dedupedQuotes.push(quote);
      seen.add(quote.document_id);
    }
  });

  return (
    <>
      <div className="p-4 border rounded-md border-gray-700">
        <h2 className="text font-bold mb-2">AI Answer</h2>
        <p className="mb-4">{answer}</p>

        <h2 className="text-sm font-bold mb-2">Sources</h2>
        <div className="flex">
          {dedupedQuotes.map((quoteInfo) => (
            <a
              key={quoteInfo.document_id}
              className="p-2 border border-gray-800 rounded-lg text-sm flex max-w-[230px] hover:bg-gray-800"
              href={quoteInfo.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              {getSourceIcon(quoteInfo.source_type)}
              <p className="truncate break-all">
                {quoteInfo.semantic_identifier || quoteInfo.document_id}
              </p>
            </a>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <div className="font-bold border-b mb-4 pb-1 border-gray-800">
          Results
        </div>
        {dedupedQuotes.map((quoteInfo) => (
          <div key={quoteInfo.document_id} className="text-sm">
            <a
              className="rounded-lg flex font-bold"
              href={quoteInfo.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              {getSourceIcon(quoteInfo.source_type)}
              <p className="truncate break-all">
                {quoteInfo.semantic_identifier || quoteInfo.document_id}
              </p>
            </a>
            <p className="p-2 mb-2 text-gray-200">{quoteInfo.blurb}</p>
          </div>
        ))}
      </div>
    </>
  );
};
