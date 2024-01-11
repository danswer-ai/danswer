import { DanswerDocument, SearchRequestArgs } from "./interfaces";

interface KeywordResponse {
  top_ranked_docs: DanswerDocument[];
  lower_ranked_docs: DanswerDocument[];
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
      collection: "danswer_index",
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
