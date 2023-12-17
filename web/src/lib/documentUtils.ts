import { HagenDocument } from "./search/interfaces";

export function removeDuplicateDocs(documents: HagenDocument[]) {
  const seen = new Set<string>();
  const output: HagenDocument[] = [];
  documents.forEach((document) => {
    if (document.document_id && !seen.has(document.document_id)) {
      output.push(document);
      seen.add(document.document_id);
    }
  });
  return output;
}
