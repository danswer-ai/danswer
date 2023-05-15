import React from "react";
import { Globe, SlackLogo, GoogleDriveLogo } from "@phosphor-icons/react";
import "tailwindcss/tailwind.css";
import { Quote, Document } from "./types";
import { LoadingAnimation } from "../Loading";
import { GithubIcon } from "../icons/icons";

interface SearchResultsDisplayProps {
  answer: string | null;
  quotes: Record<string, Quote> | null;
  documents: Document[] | null;
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
    case "github":
      return <GithubIcon size={ICON_SIZE} className={ICON_STYLE} />;
    default:
      return null;
  }
};

export const SearchResultsDisplay: React.FC<SearchResultsDisplayProps> = ({
  answer,
  quotes,
  documents,
  isFetching,
}) => {
  if (!answer) {
    if (isFetching) {
      return <LoadingAnimation />;
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
        <h2 className="text font-bold mb-2">AI Answer</h2>
        <p className="mb-4">{answer}</p>

        {dedupedQuotes.length > 0 && (
          <>
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
          </>
        )}
      </div>
      {/* Only display docs once we're done fetching to avoid distracting from the AI answer*/}
      {!isFetching && documents && documents.length > 0 && (
        <div className="mt-4">
          <div className="font-bold border-b mb-4 pb-1 border-gray-800">
            Results
          </div>
          {documents.slice(0, 5).map((doc) => (
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
                {getSourceIcon(doc.source_type)}
                <p className="truncate break-all">
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
