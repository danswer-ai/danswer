import React, { useState } from "react";

const defaultStyle =
  "py-1 px-2 border rounded border-gray-700 cursor-pointer font-bold ";

export enum SearchType {
  AI = "AI Search",
  Traditional = "Traditional",
}

interface Props {
  selectedSearchType: SearchType;
  setSelectedSearchType: (searchType: SearchType) => void;
}

export const SearchTypeSelector: React.FC<Props> = ({
  selectedSearchType,
  setSelectedSearchType,
}) => {
  return (
    <div className="flex text-xs">
      <div
        className={
          defaultStyle +
          (selectedSearchType === SearchType.AI
            ? "bg-blue-500"
            : "bg-gray-800 hover:bg-gray-600")
        }
        onClick={() => setSelectedSearchType(SearchType.AI)}
      >
        AI Search
      </div>

      <div
        className={
          defaultStyle +
          "ml-2 " +
          (selectedSearchType === SearchType.Traditional
            ? "bg-blue-500"
            : "bg-gray-800 hover:bg-gray-600")
        }
        onClick={() => setSelectedSearchType(SearchType.Traditional)}
      >
        Keyword Search
      </div>
    </div>
  );
};
