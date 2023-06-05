"use client";

import { useState } from "react";
import { SearchBar } from "./SearchBar";
import { SearchResultsDisplay } from "./SearchResultsDisplay";
import { Quote, Document, SearchResponse } from "./types";
import { SourceSelector } from "./Filters";
import { Source } from "./interfaces";

const initialSearchResponse: SearchResponse = {
  answer: null,
  quotes: null,
  documents: null,
};

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

<<<<<<< HEAD
const searchRequestStreamed = async (
  query: string,
  updateCurrentAnswer: (val: string) => void,
  updateQuotes: (quotes: Record<string, Quote>) => void,
  updateDocs: (docs: Document[]) => void
) => {
  const url = new URL("/api/stream-direct-qa", window.location.origin);
  const params = new URLSearchParams({
    query,
    collection: "danswer_index",
  }).toString();
  url.search = params;
=======
interface SearchRequestStreamedArgs {
  query: string;
  sources: Source[];
  updateCurrentAnswer: (val: string) => void;
  updateQuotes: (quotes: Record<string, Quote>) => void;
  updateDocs: (docs: Document[]) => void;
}
>>>>>>> c58d4d7 (Adding filters)

const searchRequestStreamed = async ({
  query,
  sources,
  updateCurrentAnswer,
  updateQuotes,
  updateDocs,
}: SearchRequestStreamedArgs) => {
  let answer = "";
  let quotes: Record<string, Quote> | null = null;
  let relevantDocuments: Document[] | null = null;
  try {
    const response = await fetch("/api/stream-direct-qa", {
      method: "POST",
      body: JSON.stringify({
        query,
        collection: "semantic_search",
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
        } else if (chunk.answer_finished) {
          // set quotes as non-null to signify that the answer is finished and
          // we're now looking for quotes
          updateQuotes({});
          if (
            !answer.endsWith(".") &&
            !answer.endsWith("?") &&
            !answer.endsWith("!")
          ) {
            answer += ".";
            updateCurrentAnswer(answer);
          }
        } else {
          if (Object.hasOwn(chunk, "top_documents")) {
            const docs = chunk.top_documents as any[] | null;
            if (docs) {
              relevantDocuments = docs.map(
                (doc) => JSON.parse(doc) as Document
              );
              updateDocs(relevantDocuments);
            }
          } else {
            quotes = chunk as Record<string, Quote>;
            updateQuotes(quotes);
          }
        }
      });
    }
  } catch (err) {
    console.error("Fetch error:", err);
  }
  return { answer, quotes, relevantDocuments };
};

export const SearchSection: React.FC<{}> = () => {
  // Search
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(
    null
  );
  const [isFetching, setIsFetching] = useState(false);

  // Filters
  const [sources, setSources] = useState<Source[]>([]);

  return (
    <div className="relative max-w-[1500px] mx-auto">
      <div className="absolute left-0 ml-24 hidden 2xl:block">
        <SourceSelector
          selectedSources={sources}
          setSelectedSources={setSources}
        />
      </div>
      <div className="w-[800px] mx-auto">
        <SearchBar
          onSearch={(query) => {
            setIsFetching(true);
            setSearchResponse({
              answer: null,
              quotes: null,
              documents: null,
            });
            searchRequestStreamed({
              query,
              sources,
              updateCurrentAnswer: (answer) =>
                setSearchResponse((prevState) => ({
                  ...(prevState || initialSearchResponse),
                  answer,
                })),
              updateQuotes: (quotes) =>
                setSearchResponse((prevState) => ({
                  ...(prevState || initialSearchResponse),
                  quotes,
                })),
              updateDocs: (documents) =>
                setSearchResponse((prevState) => ({
                  ...(prevState || initialSearchResponse),
                  documents,
                })),
            }).then(() => {
              setIsFetching(false);
            });
          }}
        />
        <div className="mt-2">
          <SearchResultsDisplay
            searchResponse={searchResponse}
            isFetching={isFetching}
          />
        </div>
      </div>
    </div>
  );
};
