import { Source } from "./interfaces";
import { DateRangePickerValue } from "@tremor/react";

export const buildFilters = (
  sources: Source[],
  documentSets: string[],
  timeRange: DateRangePickerValue | null
) => {
  const filters = {
    source_type:
      sources.length > 0 ? sources.map((source) => source.internalName) : null,
    document_set: documentSets.length > 0 ? documentSets : null,
    time_cutoff: timeRange?.from ? timeRange.from : null,
  };

  return filters;
};
