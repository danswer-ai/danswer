import { WebResultIcon } from "@/components/WebResultIcon";
import { SourceIcon } from "@/components/SourceIcon";
import { DanswerDocument } from "@/lib/search/interfaces";
import { truncateString } from "@/lib/utils";
import { SetStateAction } from "react";
import { Dispatch } from "react";
import { ValidSources } from "@/lib/types";
import { FileDescriptor } from "@/app/chat/interfaces";

export default function FileSourceCard({
  file,
  setPresentingDocument,
}: {
  file: FileDescriptor;
  setPresentingDocument?: (document: DanswerDocument) => void;
}) {
  return (
    <div
      key={file.id}
      onClick={() => {
        if (setPresentingDocument) {
          setPresentingDocument({
            document_id: file.id,
            source_type: ValidSources.File,
            semantic_identifier: file.name,
          } as DanswerDocument);
        }
      }}
      className="cursor-pointer text-left overflow-hidden flex flex-col gap-0.5 rounded-sm px-3 py-2.5 hover:bg-background-125 bg-background-100 w-[200px]"
    >
      <div className="line-clamp-1 font-semibold text-ellipsis text-text-900 flex h-6 items-center gap-2 text-sm">
        <SourceIcon sourceType={ValidSources.File} iconSize={18} />
        <p>{truncateString(file.name || file.id || "", 12)}</p>
      </div>
      <div className="line-clamp-2 text-sm font-semibold"></div>
      <div className="line-clamp-2 text-sm font-normal leading-snug text-text-700">
        {file.type}
      </div>
    </div>
  );
}

interface SeeMoreBlockProps {
  documentSelectionToggled: boolean;
  toggleDocumentSelection?: () => void;
  uniqueSources: DanswerDocument["source_type"][];
}

export function FileSeeMoreBlock({
  documentSelectionToggled,
  toggleDocumentSelection,
  uniqueSources,
}: SeeMoreBlockProps) {
  return (
    <div
      onClick={toggleDocumentSelection}
      className={`
        ${documentSelectionToggled ? "border-border-100 border" : ""}
        cursor-pointer w-[150px] rounded-sm flex-none transition-all duration-500 hover:bg-background-125 bg-text-100 px-3 py-2.5
      `}
    >
      <div className="line-clamp-1 font-semibold text-ellipsis text-text-900 flex h-6 items-center justify-between text-sm">
        <p className="mr-0 flex-shrink-0">
          {documentSelectionToggled ? "Hide sources" : "See context"}
        </p>
        <div className="flex -space-x-3 flex-shrink-0 overflow-hidden">
          {uniqueSources.map((sourceType, ind) => (
            <div
              key={ind}
              className="inline-block bg-background-100 rounded-full p-0.5"
              style={{ zIndex: uniqueSources.length - ind }}
            >
              <div className="bg-background-100 rounded-full">
                <SourceIcon sourceType={sourceType} iconSize={20} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="line-clamp-2 text-sm font-semibold"></div>
      <div className="line-clamp-2 text-sm font-normal leading-snug text-text-700">
        See more
      </div>
    </div>
  );
}
