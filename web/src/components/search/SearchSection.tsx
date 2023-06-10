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
} from "@/lib/search/interfaces";
import { searchRequestStreamed } from "@/lib/search/streaming";
import Cookies from "js-cookie";
import { SearchHelper } from "./SearchHelper";

interface SearchSectionProps {
  connectors: Connector<any>[];
  defaultSearchType: SearchType;
}

export const SearchSection: React.FC<SearchSectionProps> = ({
  connectors,
  defaultSearchType,
}) => {
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

  // helpers
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

  return (
    <div className="relative mx-auto">
      <div className="absolute left-0 ml-12 block">
        {connectors.length > 0 && (
          <SourceSelector
            selectedSources={sources}
            setSelectedSources={setSources}
            existingSources={connectors.map((connector) => connector.source)}
          />
        )}
      </div>
      <div className="w-[1000px] mx-auto flex">
        <div className="w-[800px] mx-auto">
          <SearchTypeSelector
            selectedSearchType={selectedSearchType}
            setSelectedSearchType={(searchType) => {
              Cookies.set("searchType", searchType);
              setSelectedSearchType(searchType);
            }}
          />

          <SearchBar
            onSearch={async (query) => {
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
                selectedSearchType,
              });

              setIsFetching(false);
            }}
          />

          <div className="mt-2">
            <SearchResultsDisplay
              searchResponse={searchResponse}
              isFetching={isFetching}
            />
          </div>
        </div>
        
        <div className="ml-4">
        <SearchHelper searchResponse={searchResponse}/>
        </div>
      </div>
    </div>
  );
};
