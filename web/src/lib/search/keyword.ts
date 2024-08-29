import { EnmeddDocument, SearchRequestArgs } from "./interfaces";

interface KeywordResponse {
  top_ranked_docs: EnmeddDocument[];
  lower_ranked_docs: EnmeddDocument[];
}

export const keywordSearch = async ({
  query,
  sources,
  updateDocs,
}: SearchRequestArgs): Promise<void> => {
  const response = await fetch("/api/keyword-search", {
    method: "POST",
    body: JSON.stringify({
      query,
      // TODO: replace the naming convention used here
      collection: "enmedd_index",
      ...(sources.length > 0
        ? {
            filters: [
              {
                source_type: sources.map((source) => source.internalName),
              },
            ],
          }
        : {}),
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    return;
  }

  const keywordResults = (await response.json()) as KeywordResponse;

  let matchingDocs = keywordResults.top_ranked_docs;
  if (keywordResults.lower_ranked_docs) {
    matchingDocs = matchingDocs.concat(keywordResults.lower_ranked_docs);
  }

  updateDocs(matchingDocs);
};
