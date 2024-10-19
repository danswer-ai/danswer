import { EnmeddDocument } from "./search/interfaces";

export function removeDuplicateDocs(
  documents: EnmeddDocument[],
  agentic?: boolean,
  relevance?: any
) {
  const seen = new Set<string>();
  const output: EnmeddDocument[] = [];
  documents.forEach((document) => {
    if (
      document.document_id &&
      !seen.has(document.document_id) &&
      (!agentic || (agentic && relevance && relevance[document.document_id]))
    ) {
      output.push(document);
      seen.add(document.document_id);
    }
  });
  return output;
}
