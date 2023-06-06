import React, { useState, KeyboardEvent, ChangeEvent } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";

interface SearchBarProps {
  onSearch: (searchTerm: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = useState<string>("");

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const target = event.target;
    setSearchTerm(target.value);

    // Resize the textarea to fit the content
    target.style.height = "24px";
    const newHeight = target.scrollHeight;
    target.style.height = `${newHeight}px`;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      onSearch(searchTerm);
      event.preventDefault();
    }
  };

  return (
    <div className="flex justify-center py-3">
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
