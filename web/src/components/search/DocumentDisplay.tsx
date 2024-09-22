import { EnmeddDocument } from "@/lib/search/interfaces";
import { DocumentFeedbackBlock } from "./DocumentFeedbackBlock";
import { useState } from "react";
import { DocumentUpdatedAtBadge } from "./DocumentUpdatedAtBadge";
import { SourceIcon } from "../SourceIcon";
import { MetadataBadge } from "../MetadataBadge";
import { Badge } from "../ui/badge";
import { CustomTooltip } from "../CustomTooltip";
import { Info, Radio, Tag } from "lucide-react";

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
            <b key={index} className="text-highlight-text">
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
        <b key={sections.length} className="text-highlight-text">
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
  document: EnmeddDocument;
}) {
  // don't display super long tags, as they are ugly
  const MAXIMUM_TAG_LENGTH = 40;

  return (
    <div className="flex flex-col">
      {document.updated_at && (
        <DocumentUpdatedAtBadge updatedAt={document.updated_at} />
      )}

      {Object.entries(document.metadata).length > 0 && (
        <>
          <div className="pl-1 border-l border-border" />
          {Object.entries(document.metadata)
            .filter(
              ([key, value]) => (key + value).length <= MAXIMUM_TAG_LENGTH
            )
            .map(([key, value]) => {
              return (
                <MetadataBadge
                  key={key}
                  icon={<Tag size={12} />}
                  value={`${key}=${value}`}
                />
              );
            })}
        </>
      )}
    </div>
  );
}

interface DocumentDisplayProps {
  document: EnmeddDocument;
  messageId: number | null;
  documentRank: number;
  isSelected: boolean;
}

export const DocumentDisplay = ({
  document,
  messageId,
  documentRank,
  isSelected,
}: DocumentDisplayProps) => {
  const [isHovered, setIsHovered] = useState(false);

  // Consider reintroducing null scored docs in the future
  if (document.score === null) {
    return null;
  }

  const score = Math.abs(document.score) * 100;
  const badgeVariant =
    score < 50 ? "destructive" : score < 90 ? "warning" : "success";

  return (
    <div
      key={document.semantic_identifier}
      className="text-sm border-b border-border px-4 py-8 break-words break-all"
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex flex-col relative gap-3">
        <div className="flex items-center gap-[5px]">
          <Badge variant="secondary">
            <SourceIcon sourceType={document.source_type} iconSize={16} />
            <span className="ml-1">
              {document.source_type.charAt(0).toUpperCase() +
                document.source_type.slice(1)}
            </span>
          </Badge>
          <DocumentMetadataBlock document={document} />
          {document.score !== null && (
            <div className="flex items-center gap-[5px]">
              <Badge variant={badgeVariant}>{score.toFixed()}%</Badge>
              {isSelected && (
                <CustomTooltip
                  trigger={
                    <Badge variant="secondary">
                      <Radio size={16} />
                    </Badge>
                  }
                >
                  <div className="text-xs flex">
                    <div className="flex mx-auto">
                      <div className="w-3 h-3 flex flex-col my-auto mr-1">
                        <Info className="my-auto" />
                      </div>
                      <div className="my-auto">The AI liked this doc!</div>
                    </div>
                  </div>
                </CustomTooltip>
              )}
            </div>
          )}
        </div>
        <a
          className={
            "rounded-regular flex font-bold text-dark-900 max-w-full " +
            (document.link ? "" : "pointer-events-none")
          }
          href={document.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          <p className="truncate text-wrap break-all my-auto text-base max-w-full">
            {document.semantic_identifier || document.document_id}
          </p>
        </a>
      </div>
      <p className="break-words pt-3">
        {buildDocumentSummaryDisplay(document.match_highlights, document.blurb)}
      </p>
    </div>
  );
};
