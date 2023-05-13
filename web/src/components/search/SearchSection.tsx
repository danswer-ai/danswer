"use client";

import { useState } from "react";
import { SearchBar } from "./SearchBar";
import { SearchResultsDisplay } from "./SearchResultsDisplay";
import { Quote, Document } from "./types";

const processSingleChunk = (
  chunk: string,
  currPartialChunk: string | null
): [{ [key: string]: any } | null, string | null] => {
  const completeChunk = chunk + (currPartialChunk || "");
  try {
    // every complete chunk should be valid JSON
    const chunkJson = JSON.parse(chunk);
    return [chunkJson, null];
  } catch (err) {
    // if it's not valid JSON, then it's probably an incomplete chunk
    return [null, completeChunk];
  }
};

const processRawChunkString = (
  rawChunkString: string,
  previousPartialChunk: string | null
): [any[], string | null] => {
  /* This is required because, in practice, we see that nginx does not send over
  each chunk one at a time even with buffering turned off. Instead,
  chunks are sometimes in batches or are sometimes incomplete */
  if (!rawChunkString) {
    return [[], null];
  }
  const chunkSections = rawChunkString
    .split("\n")
    .filter((chunk) => chunk.length > 0);
  let parsedChunkSections: any[] = [];
  let currPartialChunk = previousPartialChunk;
  chunkSections.forEach((chunk) => {
    const [processedChunk, partialChunk] = processSingleChunk(
      chunk,
      currPartialChunk
    );
    if (processedChunk) {
      parsedChunkSections.push(processedChunk);
    } else {
      currPartialChunk = partialChunk;
    }
  });
  return [parsedChunkSections, currPartialChunk];
};

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

    let previousPartialChunk = null;
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
      const [completedChunks, partialChunk] = processRawChunkString(
        decoder.decode(value, { stream: true }),
        previousPartialChunk
      );
      if (!completedChunks.length && !partialChunk) {
        break;
      }
      if (partialChunk) {
        previousPartialChunk = partialChunk;
      }
      completedChunks.forEach((chunk) => {
        // TODO: clean up response / this logic
        const answerChunk = chunk.answer_data;
        if (answerChunk) {
          answer += answerChunk;
          updateCurrentAnswer(answer);
        } else {
          const docs = chunk.top_documents as any[];
          if (docs) {
            updateDocs(docs.map((doc) => JSON.parse(doc) as Document));
          } else {
            updateQuotes(chunk as Record<string, Quote>);
          }
        }
      });
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
              // if no quotes were given, set to empty object so that the SearchResultsDisplay
              // component knows that the search was successful but no quotes were found
              if (!quotes) {
                setQuotes({});
              }
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
