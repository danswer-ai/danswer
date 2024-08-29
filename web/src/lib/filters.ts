import { Assistant } from "@/app/admin/assistants/interfaces";
import { DocumentSet, ValidSources } from "./types";
import { getSourcesForAssistant } from "./sources";

export function computeAvailableFilters({
  selectedAssistant,
  availableSources,
  availableDocumentSets,
}: {
  selectedAssistant: Assistant | undefined | null;
  availableSources: ValidSources[];
  availableDocumentSets: DocumentSet[];
}): [ValidSources[], DocumentSet[]] {
  const finalAvailableSources =
    selectedAssistant && selectedAssistant.document_sets.length
      ? getSourcesForAssistant(selectedAssistant)
      : availableSources;

  // only display document sets that are available to the assistant
  // in filters
  const assistantDocumentSetIds =
    selectedAssistant && selectedAssistant.document_sets.length
      ? selectedAssistant.document_sets.map((documentSet) => documentSet.id)
      : null;
  const finalAvailableDocumentSets = assistantDocumentSetIds
    ? availableDocumentSets.filter((documentSet) =>
        assistantDocumentSetIds.includes(documentSet.id)
      )
    : availableDocumentSets;

  return [finalAvailableSources, finalAvailableDocumentSets];
}
