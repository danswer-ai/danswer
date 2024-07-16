"use client";

import { removeDuplicateDocs } from "@/lib/documentUtils";
import {
  DanswerDocument,
  DocumentRelevance,
  FlowType,
  Quote,
  Relevance,
  SearchDanswerDocument,
  SearchDefaultOverrides,
  SearchResponse,
  ValidQuestionResponse,
} from "@/lib/search/interfaces";
import { usePopup } from "../admin/connectors/Popup";
import { AlertIcon, BroomIcon, UndoIcon } from "../icons/icons";
import { AgenticDocumentDisplay, DocumentDisplay } from "./DocumentDisplay";
import { searchState } from "./SearchSection";
import { useEffect, useState } from "react";
import { Tooltip } from "../tooltip/Tooltip";
import KeyboardSymbol from "@/lib/browserUtilities";

const getSelectedDocumentIds = (
  documents: SearchDanswerDocument[],
  selectedIndices: number[]
) => {
  const selectedDocumentIds = new Set<string>();
  selectedIndices.forEach((ind) => {
    selectedDocumentIds.add(documents[ind].document_id);
  });
  return selectedDocumentIds;
};

export const SearchResultsDisplay = ({
  agenticResults,
  searchResponse,
  searchState,
  contentEnriched,
  validQuestionResponse,
  isFetching,
  defaultOverrides,
  personaName = null,
  performSweep,
  sweep,
  comments,
}: {
  contentEnriched?: boolean;
  agenticResults?: boolean | null;
  performSweep: () => void;
  sweep?: boolean;
  searchState: searchState;
  searchResponse: SearchResponse | null;
  validQuestionResponse: ValidQuestionResponse;
  isFetching: boolean;
  defaultOverrides: SearchDefaultOverrides;
  personaName?: string | null;
  comments: any;
}) => {
  const commandSymbol = KeyboardSymbol();
  const { popup, setPopup } = usePopup();
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        switch (event.key.toLowerCase()) {
          case "o":
            event.preventDefault();

            performSweep();
            if (agenticResults) {
              setShowAll((showAll) => !showAll);
            }
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (!searchResponse) {
    return null;
  }

  const { answer, quotes, documents, error, messageId } = searchResponse;

  if (isFetching && !answer && !documents) {
    return null;
  }
  if (
    answer === null &&
    documents != null &&
    documents.length == 0 &&
    !isFetching
  ) {
    return (
      <div className="text-base gap-x-1.5 flex">
        <AlertIcon size={16} className="text-error my-auto mr-1" />
        <p className="text-error ">No documents were found!</p>
        <p>Have you set up a connector?</p>
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
        {error && (
          <div className="text-error text-sm">
            <div className="flex">
              <AlertIcon size={16} className="text-error my-auto mr-1" />
              <p className="italic">{error || "No documents were found!"}</p>
            </div>
          </div>
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

  const relevantDocs = documents
    ? documents.filter((doc) => {
        return (
          showAll ||
          (searchResponse &&
            searchResponse.additional_relevance &&
            searchResponse.additional_relevance[doc.document_id].relevant) ||
          doc.relevant_search_result
        );
      })
    : [];

  const orderedDocs =
    contentEnriched && documents
      ? documents.sort((a, b) =>
          a.relevant_search_result === b.relevant_search_result
            ? 0
            : a.relevant_search_result
              ? -1
              : 1
        )
      : documents ?? [];

  return (
    <>
      {popup}
      {documents && documents.length == 0 && (
        <p className="flex text-lg font-bold">
          No docs found! Ensure that you have enabled at least one connector
        </p>
      )}

      {documents && documents.length > 0 && (
        <div className="mt-4">
          <div className="font-bold flex justify-between text-emphasis border-b mb-3 pb-1 border-border text-lg">
            <p>Results</p>
            {(contentEnriched || searchResponse.additional_relevance) && (
              <Tooltip delayDuration={1000} content={`${commandSymbol}O`}>
                <button
                  onClick={() => {
                    performSweep();
                    if (agenticResults) {
                      setShowAll((showAll) => !showAll);
                    }
                  }}
                  className={`flex items-center justify-center animate-fade-in-up rounded-lg p-1 text-xs transition-all duration-300 w-16 h-8 ${
                    !sweep
                      ? "bg-green-500 text-text-800"
                      : "bg-rose-700 text-text-100"
                  }`}
                  style={{
                    transform: sweep ? "rotateZ(180deg)" : "rotateZ(0deg)",
                  }}
                >
                  <div
                    className={`flex items-center ${sweep ? "rotate-180" : ""}`}
                  >
                    <span></span>
                    {!sweep
                      ? agenticResults
                        ? "all"
                        : "hide"
                      : agenticResults
                        ? "hide"
                        : "undo"}
                    {!sweep ? (
                      <BroomIcon className="h-4 w-4" />
                    ) : (
                      <UndoIcon className="h-4 w-4" />
                    )}
                  </div>
                </button>
              </Tooltip>
            )}
          </div>

          {agenticResults &&
            relevantDocs &&
            contentEnriched &&
            relevantDocs.length == 0 &&
            !showAll && (
              <p className="flex text-lg font-bold">
                No high quality results found by agentic search.
              </p>
            )}

          {orderedDocs.map((document, ind) => {
            const relevance: DocumentRelevance | null =
              searchResponse.additional_relevance
                ? searchResponse.additional_relevance[document.document_id]
                : null;

            return agenticResults ? (
              <AgenticDocumentDisplay
                additional_relevance={relevance}
                contentEnriched={contentEnriched}
                comments={comments}
                index={ind}
                hide={
                  showAll ||
                  relevance?.relevant ||
                  document.relevant_search_result
                }
                key={`${document.document_id}-${ind}`}
                document={document}
                documentRank={ind + 1}
                messageId={messageId}
                isSelected={selectedDocumentIds.has(document.document_id)}
                setPopup={setPopup}
              />
            ) : (
              <DocumentDisplay
                additional_relevance={relevance}
                contentEnriched={contentEnriched}
                index={ind}
                hide={
                  sweep &&
                  !document.relevant_search_result &&
                  !relevance?.relevant
                }
                key={`${document.document_id}-${ind}`}
                document={document}
                documentRank={ind + 1}
                messageId={messageId}
                isSelected={selectedDocumentIds.has(document.document_id)}
                setPopup={setPopup}
              />
            );
          })}
        </div>
      )}

      <div className="h-[100px]" />
    </>
  );
};

export function AgenticDisclaimer({
  forceNonAgentic,
}: {
  forceNonAgentic: () => void;
}) {
  return (
    <div className="ml-auto mx-12 flex transition-all duration-300 animate-fade-in flex-col gap-y-2">
      <p className="text-sm">
        Please note that agentic quries can take substantially longer than
        non-agentic queries. You can click <i>non-agentic</i> to re-submit your
        query without agentic capabilities.
      </p>
      <button
        onClick={forceNonAgentic}
        className="p-2 bg-background-900 mr-auto text-text-200 rounded-lg text-xs my-auto"
      >
        Non-agentic
      </button>
    </div>
  );
}
