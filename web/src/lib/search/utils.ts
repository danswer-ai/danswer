import { Source } from "./interfaces";

export const buildFilters = (sources: Source[], documentSets: string[]) => {
  const filters = [];
  if (sources.length > 0) {
    filters.push({
      source_type: sources.map((source) => source.internalName),
    });
  }
  if (documentSets.length > 0) {
    filters.push({
      document_sets: documentSets,
    });
  }
  return filters;
};
