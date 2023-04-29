import React from "react";
import { Globe, SlackLogo, GoogleDriveLogo } from "@phosphor-icons/react";
import "tailwindcss/tailwind.css";
import { SearchResponse } from "./types";
import { ThinkingAnimation } from "./Thinking";

interface SearchResultsDisplayProps {
  data: SearchResponse | undefined;
  isFetching: boolean;
}

const getSourceIcon = (sourceType: string) => {
  switch (sourceType) {
    case "Web":
      return <Globe className="text-blue-600" />;
    case "Slack":
      return <SlackLogo className="text-blue-600" />;
    case "Google Drive":
      return <GoogleDriveLogo className="text-blue-600" />;
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

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Answer</h2>
      <p className="mb-6">{answer}</p>

      <h2 className="text-2xl font-bold mb-4">Quotes</h2>
      <ul>
        {Object.entries(quotes).map(([quoteText, quoteInfo]) => (
          <li key={quoteInfo.document_id} className="mb-4">
            <blockquote className="italic text-lg mb-2">{quoteText}</blockquote>
            <p>
              <strong>Source:</strong> {getSourceIcon(quoteInfo.source_type)}{" "}
              {quoteInfo.source_type}
            </p>
            <p>
              <strong>Link:</strong>{" "}
              <a
                href={quoteInfo.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600"
              >
                {quoteInfo.link}
              </a>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};
