import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import React, { forwardRef } from "react";

interface SearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ placeholder = "Search...", value, onChange, onKeyDown }, ref) => {
    return (
      <div className="w-full relative">
        <Input
          ref={ref}
          className="pl-9"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2"
          size={15}
        />
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";
