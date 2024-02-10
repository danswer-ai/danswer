import { DanswerDocument } from "@/lib/search/interfaces";
import { DocumentFeedbackBlock } from "./DocumentFeedbackBlock";
import { useState } from "react";
import { PopupSpec } from "../admin/connectors/Popup";
import { HoverPopup } from "@/components/HoverPopup";
import { DocumentUpdatedAtBadge } from "./DocumentUpdatedAtBadge";
import { FiInfo, FiRadio, FiTag } from "react-icons/fi";
import { SourceIcon } from "../SourceIcon";
import { MetadataBadge } from "../MetadataBadge";

export const buildDocumentSummaryDisplay = (
  matchHighlights: string[],
  blurb: string
) => {
  if (matchHighlights.length === 0) {
    return blurb;
  }

  // content, isBold, isContinuation
  let sections = [] as [string, boolean, boolean][];
  matchHighlights.forEach((matchHighlight, matchHighlightIndex) => {
    if (!matchHighlight) {
      return;
    }

    const words = matchHighlight.split(new RegExp("\\s"));
    words.forEach((word) => {
      if (!word) {
        return;
      }

      let isContinuation = false;
      while (word.includes("<hi>") && word.includes("</hi>")) {
        const start = word.indexOf("<hi>");
        const end = word.indexOf("</hi>");
        const before = word.slice(0, start);
        const highlight = word.slice(start + 4, end);
        const after = word.slice(end + 5);

        if (before) {
          sections.push([before, false, isContinuation]);
          isContinuation = true;
        }
        sections.push([highlight, true, isContinuation]);
        isContinuation = true;
        word = after;
      }

      if (word) {
        sections.push([word, false, isContinuation]);
      }
    });
    if (matchHighlightIndex != matchHighlights.length - 1) {
      sections.push(["...", false, false]);
    }
  });

  let previousIsContinuation = sections[0][2];
  let previousIsBold = sections[0][1];
  let currentText = "";
  const finalJSX = [] as (JSX.Element | string)[];
  sections.forEach(([word, shouldBeBold, isContinuation], index) => {
    if (shouldBeBold != previousIsBold) {
      if (currentText) {
        if (previousIsBold) {
          // remove leading space so that we don't bold the whitespace
          // in front of the matching keywords
          currentText = currentText.trim();
          if (!previousIsContinuation) {
            finalJSX[finalJSX.length - 1] = finalJSX[finalJSX.length - 1] + " ";
          }
          finalJSX.push(
            <b key={index} className="text-default bg-highlight-text">
              {currentText}
            </b>
          );
        } else {
          finalJSX.push(currentText);
        }
      }
      currentText = "";
    }
    previousIsBold = shouldBeBold;
    previousIsContinuation = isContinuation;
    if (!isContinuation || index === 0) {
      currentText += " ";
    }
    currentText += word;
  });
  if (currentText) {
    if (previousIsBold) {
      currentText = currentText.trim();
      if (!previousIsContinuation) {
        finalJSX[finalJSX.length - 1] = finalJSX[finalJSX.length - 1] + " ";
      }
      finalJSX.push(
        <b key={sections.length} className="text-default bg-highlight-text">
          {currentText}
        </b>
      );
    } else {
      finalJSX.push(currentText);
    }
  }
  return finalJSX;
};

export function DocumentMetadataBlock({
  document,
}: {
  document: DanswerDocument;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {document.updated_at && (
        <div className="pr-1">
          <DocumentUpdatedAtBadge updatedAt={document.updated_at} />
        </div>
      )}
      {Object.entries(document.metadata).length > 0 && (
        <>
          <div className="pl-1 border-l border-border" />
          {Object.entries(document.metadata).map(([key, value]) => {
            return (
              <MetadataBadge key={key} icon={FiTag} value={`${key}=${value}`} />
            );
          })}
        </>
      )}
    </div>
  );
}

interface DocumentDisplayProps {
  document: DanswerDocument;
  messageId: number | null;
  documentRank: number;
  isSelected: boolean;
  setPopup: (popupSpec: PopupSpec | null) => void;
}

export const DocumentDisplay = ({
  document,
  messageId,
  documentRank,
  isSelected,
  setPopup,
}: DocumentDisplayProps) => {
  const [isHovered, setIsHovered] = useState(false);

  // Consider reintroducing null scored docs in the future
  if (document.score === null) {
    return null;
  }

  return (
    <div
      key={document.semantic_identifier}
      className="text-sm border-b border-border mb-3"
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex relative">
        {document.score !== null && (
          <div
            className={
              "absolute top-2/4 -translate-y-2/4 flex " +
              (isSelected ? "-left-14 w-14" : "-left-10 w-10")
            }
          >
            {isSelected && (
              <div className="w-4 h-4 my-auto mr-1 flex flex-col">
                <HoverPopup
                  mainContent={<FiRadio className="text-gray-500 my-auto" />}
                  popupContent={
                    <div className="text-xs text-gray-300 w-36 flex">
                      <div className="flex mx-auto">
                        <div className="w-3 h-3 flex flex-col my-auto mr-1">
                          <FiInfo className="my-auto" />
                        </div>
                        <div className="my-auto">The AI liked this doc!</div>
                      </div>
                    </div>
                  }
                  direction="bottom"
                  style="dark"
                />
              </div>
            )}
            <div
              className={`
                text-xs
                text-emphasis
                bg-hover
                rounded
                p-0.5
                w-fit
                my-auto
                select-none
                ml-auto
                mr-2`}
            >
              {Math.abs(document.score).toFixed(2)}
            </div>
          </div>
        )}
        <a
          className={
            "rounded-lg flex font-bold text-link max-w-full " +
            (document.link ? "" : "pointer-events-none")
          }
          href={document.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          <SourceIcon sourceType={document.source_type} iconSize={22} />
          <p className="truncate text-wrap break-all ml-2 my-auto text-base max-w-full">
            {document.semantic_identifier || document.document_id}
          </p>
        </a>
        <div className="ml-auto">
          {isHovered && messageId && (
            <DocumentFeedbackBlock
              documentId={document.document_id}
              messageId={messageId}
              documentRank={documentRank}
              setPopup={setPopup}
            />
          )}
        </div>
      </div>
      <div className="mt-1">
        <DocumentMetadataBlock document={document} />
      </div>
      <p className="pl-1 pt-2 pb-3 break-words">
        {buildDocumentSummaryDisplay(document.match_highlights, document.blurb)}
      </p>
    </div>
  );
};
