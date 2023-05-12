"use client";

import React, { useState, KeyboardEvent, ChangeEvent } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import "tailwindcss/tailwind.css";
import { SearchResultsDisplay } from "./SearchResultsDisplay";
import { SearchResponse } from "./types";

const searchRequest = async (query: string): Promise<SearchResponse> => {
  const url = new URL("/api/direct-qa", window.location.origin);
  const params = new URLSearchParams({
    query,
    collection: "semantic_search",
  }).toString();
  url.search = params;

  const response = await fetch(url);
  return response.json();
};

export const SearchSection: React.FC<{}> = () => {
  const [answer, setAnswer] = useState<SearchResponse>();
  const [isFetching, setIsFetching] = useState(false);

  return (
    <>
      <SearchBar
        onSearch={(query) => {
          setIsFetching(true);
          searchRequest(query).then((response) => {
            setIsFetching(false);
            setAnswer(response);
          });
        }}
      />
      <div className="mt-2">
        <SearchResultsDisplay data={answer} isFetching={isFetching} />
      </div>
    </>
  );
};

interface SearchBarProps {
  onSearch: (searchTerm: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = useState<string>("");

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const target = event.target;
    setSearchTerm(target.value);

    // Reset the textarea height
    target.style.height = "24px";

    // Calculate the new height based on scrollHeight
    const newHeight = target.scrollHeight;

    // Apply the new height
    target.style.height = `${newHeight}px`;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      onSearch(searchTerm);
      event.preventDefault();
    }
  };

  return (
    <div className="flex justify-center py-4">
      <div className="flex items-center w-full border-2 border-gray-600 rounded px-4 py-2 focus-within:border-blue-500">
        <MagnifyingGlass className="text-gray-400" />
        <textarea
          className="flex-grow ml-2 h-6 bg-transparent outline-none placeholder-gray-400 overflow-hidden whitespace-normal resize-none"
          role="textarea"
          aria-multiline
          placeholder="Search..."
          value={searchTerm}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          suppressContentEditableWarning={true}
        />
      </div>
    </div>
  );
};
