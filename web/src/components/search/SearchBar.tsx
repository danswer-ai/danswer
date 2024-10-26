import React, { KeyboardEvent, ChangeEvent, useContext } from "react";

import { MagnifyingGlass } from "@phosphor-icons/react";
interface FullSearchBarProps {
  disabled: boolean;
  query: string;
  setQuery: (query: string) => void;
  onSearch: (fast?: boolean) => void;
  agentic?: boolean;
  toggleAgentic?: () => void;
  ccPairs: CCPairBasicInfo[];
  documentSets: DocumentSet[];
  filterManager: any; // You might want to replace 'any' with a more specific type
  finalAvailableDocumentSets: DocumentSet[];
  finalAvailableSources: string[];
  tags: Tag[];
}

import { useRef } from "react";
import { SendIcon } from "../icons/icons";
import { Divider } from "@tremor/react";
import KeyboardSymbol from "@/lib/browserUtilities";
import { HorizontalSourceSelector } from "./filtering/Filters";
import { CCPairBasicInfo, DocumentSet, Tag } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import { CustomTooltip } from "../CustomTooltip";

export const AnimatedToggle = ({
  isOn,
  handleToggle,
}: {
  isOn: boolean;
  handleToggle: () => void;
}) => {
  const commandSymbol = KeyboardSymbol();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <CustomTooltip
      trigger={
        <div
          ref={containerRef}
          className="flex items-center justify-end my-auto ml-auto cursor-pointer"
        >
          <div ref={contentRef} className="flex items-center">
            <Switch checked={isOn} onCheckedChange={handleToggle} />
            <p className="ml-2 text-sm">Agentic</p>
          </div>
        </div>
      }
      asChild
    >
      <div className="p-2">
        <h2 className="mb-2 text-xl font-bold text-text-800">Agentic Search</h2>
        <p className="mb-4 text-sm text-text-700">
          Our most powerful search, have an AI agent guide you to pinpoint
          exactly what you&apos;re looking for.
        </p>
        <Divider />
        <h2 className="mb-2 text-xl font-bold text-text-800">Fast Search</h2>
        <p className="mb-4 text-sm text-text-700">
          Get quality results immediately, best suited for instant access to
          your documents.
        </p>
        <p className="flex mt-2 text-xs">Shortcut: ({commandSymbol}/)</p>
      </div>
    </CustomTooltip>
  );
};

export default AnimatedToggle;

export const FullSearchBar = ({
  disabled,
  query,
  setQuery,
  onSearch,
  agentic,
  toggleAgentic,
  ccPairs,
  documentSets,
  filterManager,
  finalAvailableDocumentSets,
  finalAvailableSources,
  tags,
}: FullSearchBarProps) => {
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const target = event.target;
    setQuery(target.value);

    // Resize the textarea to fit the content
    target.style.height = "24px";
    const newHeight = target.scrollHeight;
    target.style.height = `${newHeight}px`;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !(event.nativeEvent as any).isComposing
    ) {
      event.preventDefault();
      if (!disabled) {
        onSearch(agentic);
      }
    }
  };

  return (
    <div
      className="
        opacity-100
        w-full
        h-fit
        flex
        flex-col
        border
        border-border-medium
        rounded-lg
        bg-background-chatbar
        [&:has(textarea:focus)]::ring-1
        [&:has(textarea:focus)]::ring-black
        text-text-chatbar
        "
    >
      <Textarea
        rows={3}
        onKeyDownCapture={handleKeyDown}
        className={`
          w-full
          shrink
          resize-none
          border-0
          bg-background-chatbar
          whitespace-normal
          rounded-lg
          break-word
          overscroll-contain
          outline-none
          placeholder-subtle
          pl-4
          pr-12
          py-4
          h-14
          placeholder:text-text-chatbar-subtle
          max-h-80
          focus-visible:!ring-0
          focus-visible:!ring-offset-0
        `}
        autoFocus
        style={{ scrollbarWidth: "thin" }}
        role="textarea"
        aria-multiline
        placeholder="Search for anything..."
        value={query}
        onChange={handleChange}
        onKeyDown={(event) => {}}
        suppressContentEditableWarning={true}
      />
      <div
        className={`flex flex-nowrap overflow-y-hidden "2xl:justify-end" justify-between 4xl:justify-end w-full max-w-full items-center space-x-3 py-3 px-4`}
      >
        <div className="flex items-center flex-shrink-0 my-auto gap-x-3">
          {toggleAgentic && (
            <AnimatedToggle isOn={agentic!} handleToggle={toggleAgentic} />
          )}
          <div className="pl-2 my-auto">
            <button
              disabled={disabled}
              onClick={() => {
                onSearch(agentic);
              }}
              className="flex my-auto cursor-pointer"
            >
              <SendIcon
                size={28}
                className={`text-emphasis ${disabled || !query ? "bg-disabled-submit-background" : "bg-submit-background"} text-white p-1 rounded-full`}
              />
            </button>
          </div>
        </div>
      </div>
      {/*   <div className="absolute bottom-2.5 right-10"></div> */}
    </div>
  );
};

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
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !(event.nativeEvent as any).isComposing
    ) {
      onSearch();
      event.preventDefault();
    }
  };

  return (
    <div className="relative w-full">
      <MagnifyingGlass
        size={16}
        className="absolute -translate-y-1/2 left-2 top-1/2"
      />
      <Input
        autoFocus
        aria-multiline
        placeholder="Search..."
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        suppressContentEditableWarning={true}
        className="pl-7 placeholder:text-subtle"
      />
    </div>
  );
};
