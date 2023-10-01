import { FlowType } from "./interfaces";
import {
  DanswerDocument,
  Quote,
  SearchRequestArgs,
  SearchType,
} from "./interfaces";
import { buildFilters } from "./utils";

export const searchRequest = async ({
  query,
  sources,
  documentSets,
  updateCurrentAnswer,
  updateQuotes,
  updateDocs,
  updateSuggestedSearchType,
  updateSuggestedFlowType,
  updateError,
  selectedSearchType,
  offset,
}: SearchRequestArgs) => {
  let useKeyword = null;
  if (selectedSearchType !== SearchType.AUTOMATIC) {
    useKeyword = selectedSearchType === SearchType.KEYWORD ? true : false;
  }

  let answer = "";
  let quotes: Quote[] | null = null;
  let relevantDocuments: DanswerDocument[] | null = null;
  try {
    const filters = buildFilters(sources, documentSets);
    const response = await fetch("/api/direct-qa", {
      method: "POST",
      body: JSON.stringify({
        query,
        collection: "danswer_index",
        use_keyword: useKeyword,
        ...(filters.length > 0
          ? {
              filters,
            }
          : {}),
        offset: offset,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`Search request failed - ${response.statusText}`);
    }

    const data = (await response.json()) as {
      answer: string;
      quotes: Quote[];
      top_ranked_docs: DanswerDocument[];
      lower_ranked_docs: DanswerDocument[];
      predicted_flow: FlowType;
      predicted_search: SearchType;
      error: string;
    };

    answer = data.answer;
    updateCurrentAnswer(answer);

    quotes = data.quotes;
    updateQuotes(quotes);

    relevantDocuments = [...data.top_ranked_docs, ...data.lower_ranked_docs];
    updateDocs(relevantDocuments);

    updateSuggestedSearchType(data.predicted_search);
    updateSuggestedFlowType(data.predicted_flow);
    updateError(data.error);
  } catch (err) {
    console.error("Fetch error:", err);
  }
  return { answer, quotes, relevantDocuments };
};
