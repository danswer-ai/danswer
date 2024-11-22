import { InternetSearchIcon } from "@/components/InternetSearchIcon";
import { SourceIcon } from "@/components/SourceIcon";
import { DanswerDocument } from "@/lib/search/interfaces";

export default function FirstSourceCard({ doc }: { doc: DanswerDocument }) {
  return (
    <a
      key={doc.document_id}
      href={doc.link || undefined}
      target="_blank"
      rel="noopener"
      className="flex flex-col gap-0.5 rounded-sm px-3 py-2.5 hover:bg-background-125 bg-background-100 w-[200px]"
    >
      <div className="line-clamp-1 font-semibold text-ellipsis  text-text-900  flex h-6 items-center gap-2 text-sm">
        {doc.is_internet ? (
          <InternetSearchIcon url={doc.link} />
        ) : (
          <SourceIcon sourceType={doc.source_type} iconSize={18} />
        )}
        <p>
          {(doc.semantic_identifier || doc.document_id).slice(0, 12).trim()}
          {(doc.semantic_identifier || doc.document_id).length > 12 && (
            <span className="text-text-500">...</span>
          )}
        </p>
        {/* {doc.source_type} */}
      </div>
      <div className="line-clamp-2 text-sm font-semibold"></div>
      <div className="line-clamp-2 text-sm font-normal leading-snug text-text-700">
        {doc.blurb}
      </div>
    </a>
  );
}

interface SeeMoreBlockProps {
  documentSelectionToggled: boolean;
  toggleDocumentSelection?: () => void;
  uniqueSources: DanswerDocument["source_type"][];
}

export function SeeMoreBlock({
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
