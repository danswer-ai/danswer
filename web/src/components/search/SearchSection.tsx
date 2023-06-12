"use client";

import { useState } from "react";
import { SearchBar } from "./SearchBar";
import { SearchResultsDisplay } from "./SearchResultsDisplay";
import { SourceSelector } from "./Filters";
import { Connector } from "@/lib/types";
import { SearchTypeSelector } from "./SearchTypeSelector";
import {
  DanswerDocument,
  Quote,
  SearchResponse,
  Source,
  FlowType,
  SearchType,
  SearchDefaultOverrides,
  SearchRequestOverrides,
} from "@/lib/search/interfaces";
import { searchRequestStreamed } from "@/lib/search/streaming";
import Cookies from "js-cookie";
import { SearchHelper } from "./SearchHelper";
import { SearchSteps } from "./SearchSteps";

const SEARCH_DEFAULT_OVERRIDES_START: SearchDefaultOverrides = {
  forceDisplayQA: false,
  offset: 0,
};

interface SearchSectionProps {
  connectors: Connector<any>[];
  defaultSearchType: SearchType;
}

export const SearchSection: React.FC<SearchSectionProps> = ({
  connectors,
  defaultSearchType,
}) => {
  // Search Bar
  const [query, setQuery] = useState<string>("");

  // Search
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(
    null
  );
  const [isFetching, setIsFetching] = useState(false);

  // Filters
  const [sources, setSources] = useState<Source[]>([]);

  // Search Type
  const [selectedSearchType, setSelectedSearchType] =
    useState<SearchType>(defaultSearchType);

  // Overrides for default behavior that only last a single query
  const [defaultOverrides, setDefaultOverrides] =
    useState<SearchDefaultOverrides>(SEARCH_DEFAULT_OVERRIDES_START);

  // Helpers
  const initialSearchResponse: SearchResponse = {
    answer: null,
    quotes: null,
    documents: null,
    suggestedSearchType: null,
    suggestedFlowType: null,
  };
  const updateCurrentAnswer = (answer: string) =>
    setSearchResponse((prevState) => ({
      ...(prevState || initialSearchResponse),
      answer,
    }));
  const updateQuotes = (quotes: Record<string, Quote>) =>
    setSearchResponse((prevState) => ({
      ...(prevState || initialSearchResponse),
      quotes,
    }));
  const updateDocs = (documents: DanswerDocument[]) =>
    setSearchResponse((prevState) => ({
      ...(prevState || initialSearchResponse),
      documents,
    }));
  const updateSuggestedSearchType = (suggestedSearchType: SearchType) =>
    setSearchResponse((prevState) => ({
      ...(prevState || initialSearchResponse),
      suggestedSearchType,
    }));
  const updateSuggestedFlowType = (suggestedFlowType: FlowType) =>
    setSearchResponse((prevState) => ({
      ...(prevState || initialSearchResponse),
      suggestedFlowType,
    }));

  const onSearch = async ({
    searchType,
    offset,
  }: SearchRequestOverrides = {}) => {
    setIsFetching(true);
    setSearchResponse(initialSearchResponse);

    await searchRequestStreamed({
      query,
      sources,
      updateCurrentAnswer,
      updateQuotes,
      updateDocs,
      updateSuggestedSearchType,
      updateSuggestedFlowType,
      selectedSearchType: searchType ?? selectedSearchType,
      offset: offset ?? defaultOverrides.offset,
    });

    setIsFetching(false);
  };

  return (
    <div className="relative max-w-[2000px] xl:max-w-[1400px] mx-auto">
      <div className="absolute left-0 hidden 2xl:block w-64">
        {connectors.length > 0 && (
          <SourceSelector
            selectedSources={sources}
            setSelectedSources={setSources}
            existingSources={connectors.map((connector) => connector.source)}
          />
        )}

        <div className="mt-10">
          <SearchHelper
            isFetching={isFetching}
            searchResponse={searchResponse}
            selectedSearchType={selectedSearchType}
            setSelectedSearchType={setSelectedSearchType}
            defaultOverrides={defaultOverrides}
            restartSearch={onSearch}
            forceQADisplay={() =>
              setDefaultOverrides((prevState) => ({
                ...(prevState || SEARCH_DEFAULT_OVERRIDES_START),
                forceDisplayQA: true,
              }))
            }
            setOffset={(offset) => {
              setDefaultOverrides((prevState) => ({
                ...(prevState || SEARCH_DEFAULT_OVERRIDES_START),
                offset,
              }));
            }}
          />
        </div>
      </div>
      <div className="w-[800px] mx-auto">
        <SearchTypeSelector
          selectedSearchType={selectedSearchType}
          setSelectedSearchType={(searchType) => {
            Cookies.set("searchType", searchType);
            setSelectedSearchType(searchType);
          }}
        />

        <SearchBar
          query={query}
          setQuery={setQuery}
          onSearch={async () => {
            setDefaultOverrides(SEARCH_DEFAULT_OVERRIDES_START);
            await onSearch({ offset: 0 });
          }}
        />

        <div className="mt-2">
          {/* Doesn't fit in well right now, can try and add this in later */}
          {/* <SearchSteps
            isFetching={isFetching}
            searchResponse={searchResponse}
            selectedSearchType={selectedSearchType}
            defaultOverrides={defaultOverrides}
          /> */}

          <SearchResultsDisplay
            searchResponse={searchResponse}
            isFetching={isFetching}
            defaultOverrides={defaultOverrides}
          />
        </div>
      </div>
    </div>
  );
};
