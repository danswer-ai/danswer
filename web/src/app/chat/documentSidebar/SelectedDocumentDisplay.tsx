import { SourceIcon } from "@/components/SourceIcon";
import { onyxDocument } from "@/lib/search/interfaces";
import { DocumentSelector } from "./DocumentSelector";

export function SelectedDocumentDisplay({
  document,
  handleDeselect,
}: {
  document: onyxDocument;
  handleDeselect: (documentId: string) => void;
}) {
  return (
    <div className="flex">
      <SourceIcon sourceType={document.source_type} iconSize={18} />
      <p className="truncate break-all mx-2 my-auto text-sm max-w-4/6">
        {document.semantic_identifier || document.document_id}
      </p>
      <DocumentSelector
        isSelected={true}
        handleSelect={() => handleDeselect(document.document_id)}
      />
    </div>
  );
}
