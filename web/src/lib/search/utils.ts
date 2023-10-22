import { Source } from "./interfaces";

export const buildFilters = (sources: Source[], documentSets: string[]) => {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const filters = {
    source_type: sources.length > 0 ? sources.map((source) => source.internalName) : null,
    document_set: documentSets.length > 0 ? documentSets : null,
    // TODO make this a date selector
    time_cutoff: threeMonthsAgo.toISOString(),
    enable_auto_detect_filters: false,
  };

  return filters;
};
