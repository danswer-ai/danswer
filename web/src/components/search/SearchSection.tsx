"use client";

import { useState } from "react";
import { SearchBar } from "./SearchBar";
import { SearchResultsDisplay } from "./SearchResultsDisplay";
import { Quote, Document } from "./types";

const searchRequestStreamed = async (
  query: string,
  updateCurrentAnswer: (val: string) => void,
  updateQuotes: (quotes: Record<string, Quote>) => void,
  updateDocs: (docs: Document[]) => void
) => {
  const url = new URL("/api/stream-direct-qa", window.location.origin);
  const params = new URLSearchParams({
    query,
    collection: "semantic_search",
  }).toString();
  url.search = params;

  let answer = "";
  try {
    const response = await fetch(url);
    const reader = response.body?.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
      const rawChunk = await reader?.read();
      if (!rawChunk) {
        throw new Error("Unable to process chunk");
      }
      const { done, value } = rawChunk;
      if (done) {
        break;
      }

      // Process each chunk as it arrives
      const chunk = decoder.decode(value, { stream: true });
      if (!chunk) {
        break;
      }
      const chunkJson = JSON.parse(chunk);
      const answerChunk = chunkJson.answer_data;
      if (answerChunk) {
        answer += answerChunk;
        updateCurrentAnswer(answer);
      } else {
        const docs = chunkJson.top_documents as any[];
        if (docs) {
          updateDocs(docs.map((doc) => JSON.parse(doc)));
        } else {
          updateQuotes(chunkJson);
        }
      }
    }
  } catch (err) {
    console.error("Fetch error:", err);
  }
  return answer;
};

export const SearchSection: React.FC<{}> = () => {
  const [answer, setAnswer] = useState<string | null>("");
  const [quotes, setQuotes] = useState<Record<string, Quote> | null>(null);
  const [documents, setDocuments] = useState<Document[] | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  return (
    <>
      <SearchBar
        onSearch={(query) => {
          setIsFetching(true);
          setAnswer("");
          setQuotes(null);
          setDocuments(null);
          searchRequestStreamed(query, setAnswer, setQuotes, setDocuments).then(
            () => {
              setIsFetching(false);
            }
          );
        }}
      />
      <div className="mt-2">
        <SearchResultsDisplay
          answer={answer}
          quotes={quotes}
          documents={documents}
          isFetching={isFetching}
        />
      </div>
    </>
  );
};
