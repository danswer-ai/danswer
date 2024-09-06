import { SourceIcon } from "@/components/SourceIcon";
import { EnmeddDocument } from "@/lib/search/interfaces";
import {
  DocumentMetadataBlock,
  buildDocumentSummaryDisplay,
} from "@/components/search/DocumentDisplay";
import { Badge } from "@/components/ui/badge";
import { Info, Radio } from "lucide-react";
import { CustomTooltip } from "@/components/CustomTooltip";

interface DocumentDisplayProps {
  document: EnmeddDocument;
  queryEventId: number | null;
  isAIPick: boolean;
  isSelected: boolean;
  handleSelect: (documentId: string) => void;
  tokenLimitReached: boolean;
}

export function ChatDocumentDisplay({
  document,
  queryEventId,
  isAIPick,
  isSelected,
  handleSelect,
  tokenLimitReached,
}: DocumentDisplayProps) {
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
      className="flex items-start gap-2 w-full border border-border rounded-sm p-4"
    >
      <div className="pt-0.5">
        <SourceIcon sourceType={document.source_type} iconSize={18} />
      </div>
      <div className="text-sm w-full truncate flex flex-col">
        <div>
          <div className="flex items-center">
            <a
              className={
                "rounded-regular flex font-bold flex-shrink overflow-hidden text-dark-900 text-sm mr-6" +
                (document.link ? "" : "pointer-events-none")
              }
              href={document.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="truncate">
                {document.semantic_identifier || document.document_id}
              </span>
            </a>
            {document.score !== null && (
              <div className="ml-auto">
                {isAIPick && (
                  <div className="w-4 h-4 my-auto mr-1 flex flex-col">
                    <CustomTooltip trigger={<Radio className="my-auto" />}>
                      <div className="text-xs text-gray-300 flex">
                        <div className="flex mx-auto">
                          <div className="w-3 h-3 flex flex-col my-auto mr-1">
                            <Info className="my-auto" />
                          </div>
                          <div className="my-auto">The AI liked this doc!</div>
                        </div>
                      </div>
                    </CustomTooltip>
                  </div>
                )}
                <Badge variant={badgeVariant}>{score.toFixed()}%</Badge>
              </div>
            )}
          </div>
        </div>
        {(document.updated_at || document.metadata) && (
          <DocumentMetadataBlock document={document} />
        )}

        <p className="break-words whitespace-normal pt-2">
          {buildDocumentSummaryDisplay(
            document.match_highlights,
            document.blurb
          )}
        </p>
      </div>
    </div>
  );
}
