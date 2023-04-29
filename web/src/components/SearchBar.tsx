"use client";

import React, { useState, KeyboardEvent, ChangeEvent } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import "tailwindcss/tailwind.css";
import { SearchResultsDisplay } from "./SearchResultsDisplay";
import { SearchResponse } from "./types";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"; // "http://servi-lb8a1-jhqpsz92kbm2-1605938866.us-east-2.elb.amazonaws.com/direct-qa";

const searchRequest = async (query: string): Promise<SearchResponse> => {
  const response = await fetch(BACKEND_URL + "/direct-qa", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: query,
      collection: "semantic_search",
    }),
  });
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
      <SearchResultsDisplay data={answer} isFetching={isFetching} />
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

  // const handleSubmit = (event: KeyboardEvent<HTMLInputElement>) => {
  //   onSearch(searchTerm);
  // };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      onSearch(searchTerm);
      event.preventDefault();
    }
  };

  return (
    <div className="flex justify-center p-4">
      <div className="flex items-center w-[800px] border-2 border-gray-300 rounded px-4 py-2 focus-within:border-blue-500">
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
