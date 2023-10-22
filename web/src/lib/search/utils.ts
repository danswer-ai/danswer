import { Source } from "./interfaces";

export const buildFilters = (sources: Source[], documentSets: string[]) => {
  const filters = {
    source_type:
      sources.length > 0 ? sources.map((source) => source.internalName) : null,
    document_set: documentSets.length > 0 ? documentSets : null,
    // TODO make this a date selector
    time_cutoff: null,
  };

  return filters;
};
