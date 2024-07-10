"use client";

import { removeDuplicateDocs } from "@/lib/documentUtils";
import {
  DanswerDocument,
  FlowType,
  Quote,
  SearchDefaultOverrides,
  SearchResponse,
  ValidQuestionResponse,
} from "@/lib/search/interfaces";
import { usePopup } from "../admin/connectors/Popup";
import { AlertIcon, BroomIcon, UndoIcon } from "../icons/icons";
import { AgenticDocumentDisplay, DocumentDisplay } from "./DocumentDisplay";
import { searchState } from "./SearchSection";
import { useEffect, useState } from "react";

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

interface DocumentContent {
  relevant: boolean;
  content: string;
}

export interface Relevance {
  [url: string]: DocumentContent;
}

// type SearchResultsType = DocumentSearchResults;

export const SearchResultsDisplay = ({
  agenticResults,
  searchResponse,
  searchState,
  validQuestionResponse,
  isFetching,
  defaultOverrides,
  personaName = null,
  relevance,
  performSweep,
  sweep,
  comments,
}: {
  agenticResults?: boolean | null;
  performSweep: () => void;
  sweep?: boolean;
  searchState: searchState;
  searchResponse: SearchResponse | null;
  validQuestionResponse: ValidQuestionResponse;
  isFetching: boolean;
  defaultOverrides: SearchDefaultOverrides;
  personaName?: string | null;
  relevance?: Relevance;
  comments: any;
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        switch (event.key.toLowerCase()) {
          case "o":
            event.preventDefault();
            // if (relevance!=null) {
            performSweep();
            // }
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const { popup, setPopup } = usePopup();

  if (!searchResponse) {
    return null;
  }

  const { answer, quotes, documents, error, messageId } = searchResponse;

  if (isFetching && !answer && !documents) {
    return null;
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
      {documents && documents.length > 0 && (
        <div className="mt-4">
          <div className="font-bold flex justify-between text-emphasis border-b mb-3 pb-1 border-border text-lg">
            <p>Results</p>
            {relevance && !agenticResults && (
              <button
                onClick={() => performSweep()}
                className={`flex items-center justify-center animate-fade-in-up rounded-lg p-1 text-xs transition-all duration-300 w-16 h-8 ${
                  !sweep
                    ? "bg-green-500 text-solidDark"
                    : "bg-rose-700 text-lighter"
                }`}
                style={{
                  transform: sweep ? "rotateZ(180deg)" : "rotateZ(0deg)",
                }}
              >
                <div
                  className={`flex items-center ${sweep ? "rotate-180" : ""}`}
                >
                  {/* <span>⌘O</span> */}
                  <span></span>
                  {!sweep ? "hide" : "undo"}
                  {!sweep ? (
                    <BroomIcon className="h-4 w-4" />
                  ) : (
                    <UndoIcon className="h-4 w-4" />
                  )}
                </div>
              </button>
            )}
          </div>
          {removeDuplicateDocs(documents, agenticResults!, relevance).length ==
            0 && (
            <p>
              No relevant documents found! Try another query or hit the button
              below!
            </p>
          )}

          {removeDuplicateDocs(documents, agenticResults!, relevance).map(
            (document, ind) => {
              return agenticResults ? (
                <AgenticDocumentDisplay
                  comments={comments}
                  index={ind}
                  hide={
                    sweep &&
                    relevance &&
                    !relevance[document.document_id].relevant
                  }
                  relevance={relevance}
                  key={document.document_id}
                  document={document}
                  documentRank={ind + 1}
                  messageId={messageId}
                  isSelected={selectedDocumentIds.has(document.document_id)}
                  setPopup={setPopup}
                />
              ) : (
                <DocumentDisplay
                  index={ind}
                  hide={
                    sweep &&
                    relevance &&
                    !relevance[document.document_id].relevant
                  }
                  relevance={relevance}
                  key={document.document_id}
                  document={document}
                  documentRank={ind + 1}
                  messageId={messageId}
                  isSelected={selectedDocumentIds.has(document.document_id)}
                  setPopup={setPopup}
                />
              );
            }
          )}
        </div>
      )}
      <div
        className={`flex mt-4 justify-center transition-all duration-500 ${searchState == "input" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      >
        <button className=" pl-5 transition-all cursor-pointer -ml-2 bg-background-subtle text-dark h-8 my-auto rounded-r-md rounded-t-md rounded-b-md px-3 text-xs">
          <p className=" relative after:bg-neutral-600 after:absolute after:h-[1px] after:w-0 after:bottom-0 after:left-0 hover:after:w-full after:transition-all after:duration-300 duration-300">
            Show me all
          </p>
        </button>
      </div>
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
        className="p-2 bg-background-dark mr-auto text-light rounded-lg text-xs my-auto"
      >
        Non-agentic
      </button>
    </div>
  );
}
