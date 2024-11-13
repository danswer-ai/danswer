import {
  DocumentRelevance,
  EnmeddDocument,
  SearchEnmeddDocument,
} from "@/lib/search/interfaces";
import { DocumentFeedbackBlock } from "./DocumentFeedbackBlock";
import { useContext, useEffect, useState } from "react";
import { DocumentUpdatedAtBadge } from "./DocumentUpdatedAtBadge";
import { SourceIcon } from "../SourceIcon";
import { MetadataBadge } from "../MetadataBadge";
import { Badge } from "../ui/badge";
import { BookIcon, Info, Radio, Star, Tag } from "lucide-react";
import { PopupSpec } from "../admin/connectors/Popup";
import { FaStar } from "react-icons/fa";
import { SettingsContext } from "../settings/SettingsProvider";
import { LightBulbIcon } from "../icons/icons";
import { WarningCircle } from "@phosphor-icons/react";
import {
  CustomTooltip,
  CustomTooltip as SchadcnTooltip,
  TooltipGroup,
} from "../CustomTooltip";

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
  if (sections.length == 0) {
    return;
  }

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
  // const score = Math.abs(document.score) * 100;
  // const badgeVariant =
  //   score < 50 ? "destructive" : score < 80 ? "warning" : "success";

  return (
    <div className="flex gap-2 flex-wrap">
      {document.updated_at && (
        <DocumentUpdatedAtBadge updatedAt={document.updated_at} />
      )}

      {Object.entries(document.metadata).length > 0 && (
        <>
          {Object.entries(document.metadata)
            .filter(
              ([key, value]) => (key + value).length <= MAXIMUM_TAG_LENGTH
            )
            .map(([key, value]) => {
              return (
                <MetadataBadge
                  key={key}
                  icon={<Tag size={12} className="shrink-0" />}
                  value={`${key}=${value}`}
                />
              );
            })}
        </>
      )}
      {/* {document.score !== null && (
        <div className="flex items-center gap-1">
          <Badge variant={badgeVariant}>{score.toFixed()}%</Badge>
        </div>
      )} */}
    </div>
  );
}

interface DocumentDisplayProps {
  document: SearchEnmeddDocument;
  messageId: number | null;
  documentRank: number;
  isSelected: boolean;
  hide?: boolean;
  index?: number;
  contentEnriched?: boolean;
  additional_relevance: DocumentRelevance | null;
}

export const DocumentDisplay = ({
  document,
  isSelected,
  additional_relevance,
  messageId,
  contentEnriched,
  documentRank,
  hide,
  index,
}: DocumentDisplayProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [alternativeToggled, setAlternativeToggled] = useState(false);
  const relevance_explanation =
    document.relevance_explanation ?? additional_relevance?.content;
  const settings = useContext(SettingsContext);
  return (
    <div
      key={document.semantic_identifier}
      className="text-sm border-b border-border px-4 py-8 break-words break-all relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transitionDelay: `${index! * 10}ms`, // Add a delay to the transition based on index
      }}
    >
      <div
        className={`collapsible space-y-2.5 ${
          hide ? "collapsible-closed overflow-y-auto border-transparent" : ""
        }`}
      >
        <div className="flex relative">
          <a
            className={`rounded-lg flex font-bold text-link max-w-full ${
              document.link ? "" : "pointer-events-none"
            }`}
            href={document.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            <SourceIcon sourceType={document.source_type} iconSize={22} />
            <p className="truncate text-wrap break-all ml-2 my-auto line-clamp-1 text-base max-w-full">
              {document.semantic_identifier || document.document_id}
            </p>
          </a>
          <div className="ml-auto flex items-center">
            <TooltipGroup>
              {isHovered && messageId && (
                <DocumentFeedbackBlock
                  documentId={document.document_id}
                  messageId={messageId}
                  documentRank={documentRank}
                />
              )}
              {(contentEnriched || additional_relevance) &&
                relevance_explanation &&
                (isHovered || alternativeToggled) && (
                  <button
                    onClick={() =>
                      setAlternativeToggled(
                        (alternativeToggled) => !alternativeToggled
                      )
                    }
                    className="flex items-center justify-center"
                  >
                    <CustomTooltip
                      trigger={
                        <LightBulbIcon
                          className={`${alternativeToggled ? "text-green-600" : "text-blue-600"} my-auto h-4 w-4 cursor-pointer`}
                        />
                      }
                    >
                      Toggle Content
                    </CustomTooltip>
                  </button>
                )}
            </TooltipGroup>
            {!hide &&
              (document.is_relevant || additional_relevance?.relevant) && (
                <Badge variant="success" className="ml-2">
                  <Star size={16} className="shrink-0" />
                  Relevant
                </Badge>
              )}
          </div>
        </div>
        <div>
          <DocumentMetadataBlock document={document} />
        </div>

        <p
          style={{ transition: "height 0.30s ease-in-out" }}
          className="pl-1 break-words text-wrap"
        >
          {alternativeToggled && (contentEnriched || additional_relevance)
            ? relevance_explanation
            : buildDocumentSummaryDisplay(
                document.match_highlights,
                document.blurb
              )}
        </p>
      </div>
    </div>
  );
};

export const AgenticDocumentDisplay = ({
  document,
  contentEnriched,
  additional_relevance,
  messageId,
  documentRank,
  index,
  hide,
}: DocumentDisplayProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const [alternativeToggled, setAlternativeToggled] = useState(false);

  const relevance_explanation =
    document.relevance_explanation ?? additional_relevance?.content;
  return (
    <div
      key={document.semantic_identifier}
      className="text-sm border-b border-border px-4 py-8 break-words break-all relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transitionDelay: `${index! * 10}ms`, // Add a delay to the transition based on index
      }}
    >
      <div
        className={`collapsible space-y-2.5 ${!hide && "collapsible-closed overflow-y-auto border-transparent"}`}
      >
        <div className="flex relative">
          <a
            className={`rounded-lg flex font-bold text-link max-w-full ${
              document.link ? "" : "pointer-events-none"
            }`}
            href={document.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            <SourceIcon sourceType={document.source_type} iconSize={22} />
            <p className="truncate text-wrap break-all ml-2 my-auto line-clamp-1 text-base max-w-full">
              {document.semantic_identifier || document.document_id}
            </p>
          </a>

          <div className="ml-auto items-center flex">
            <TooltipGroup>
              {isHovered && messageId && (
                <DocumentFeedbackBlock
                  documentId={document.document_id}
                  messageId={messageId}
                  documentRank={documentRank}
                />
              )}

              {(contentEnriched || additional_relevance) &&
                (isHovered || alternativeToggled) && (
                  <button
                    onClick={() =>
                      setAlternativeToggled(
                        (alternativeToggled) => !alternativeToggled
                      )
                    }
                    className="flex items-center justify-center"
                  >
                    <CustomTooltip
                      trigger={
                        <BookIcon
                          size={20}
                          className="my-auto flex flex-shrink-0 text-brand-500"
                        />
                      }
                    >
                      Toggle Content
                    </CustomTooltip>
                  </button>
                )}
            </TooltipGroup>
          </div>
        </div>
        <div>
          <DocumentMetadataBlock document={document} />
        </div>

        <div className="break-words flex gap-x-2">
          <p
            className="break-words text-wrap"
            style={{ transition: "height 0.30s ease-in-out" }}
          >
            {alternativeToggled && (contentEnriched || additional_relevance)
              ? buildDocumentSummaryDisplay(
                  document.match_highlights,
                  document.blurb
                )
              : relevance_explanation || (
                  <span className="flex gap-x-1 items-center">
                    {" "}
                    <WarningCircle />
                    Model failed to produce an analysis of the document
                  </span>
                )}
          </p>
        </div>
      </div>
    </div>
  );
};
