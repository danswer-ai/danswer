/* import React, { KeyboardEvent, ChangeEvent } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  query: string;
  setQuery: (query: string) => void;
  onSearch: () => void;
}

export const SearchBar = ({ query, setQuery, onSearch }: SearchBarProps) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const target = event.target;
    setQuery(target.value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      onSearch();
      event.preventDefault();
    }
  };

  return (
    <div className="relative">
      <MagnifyingGlass className="text-emphasis absolute left-2 top-1/2 -translate-y-1/2" />
      <Input
        autoFocus
        aria-multiline
        placeholder="Search..."
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        suppressContentEditableWarning={true}
        className="pl-7"
      />
    </div>
  );
}; */
import React, { KeyboardEvent, ChangeEvent } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Filter } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

interface SearchBarProps {
  query: string;
  setQuery: (query: string) => void;
  onSearch: () => void;
  children: React.ReactNode;
}

export const SearchBar = ({
  query,
  setQuery,
  onSearch,
  children,
}: SearchBarProps) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const target = event.target;
    setQuery(target.value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      onSearch();
      event.preventDefault();
    }
  };

  return (
    <div className="relative">
      <MagnifyingGlass
        size={16}
        className="text-emphasis absolute left-2 top-1/2 -translate-y-1/2"
      />
      <Input
        autoFocus
        aria-multiline
        placeholder="Search..."
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        suppressContentEditableWarning={true}
        className="pl-7"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 lg:hidden">
        <Popover>
          <PopoverTrigger asChild className="w-full relative cursor-pointer">
            <Filter size={16} className="text-emphasis" />
          </PopoverTrigger>
          <PopoverContent className="w-[85vw] md:w-[50vw] z-overlay mt-4 text-sm absolute -right-[18px]">
            {children}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
