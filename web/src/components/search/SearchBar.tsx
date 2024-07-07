import React, { KeyboardEvent, ChangeEvent } from "react";
import { searchState } from "./SearchSection";

import { MagnifyingGlass } from "@phosphor-icons/react";

interface FullSearchBarProps {
  query: string;
  setQuery: (query: string) => void;
  onSearch: (fast?: boolean) => void;
  searchState?: searchState;
  agentic?: boolean;
  toggleAgentic?: () => void;
}

import { useState, useEffect, useRef } from "react";
import { HoverPopup } from "../HoverPopup";
import { FiInfo } from "react-icons/fi";
import { Tooltip } from "./results/Citation";
import { SendIcon } from "../icons/icons";

export const AnimatedToggle = ({
  isOn,
  handleToggle,
}: {
  isOn: boolean;
  handleToggle: () => void;
}) => {
  const [width, setWidth] = useState("auto");
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current && contentRef.current) {
        const newWidth = contentRef.current.scrollWidth;
        setWidth(`${newWidth}px`);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [isOn]);

  return (
    <Tooltip
      light
      large
      content={
        <div className="bg-white my-auto p-6 rounded-lg w-full">
          <h2 className="text-xl text-neutral-800 font-bold mb-2">
            Agentic Search
          </h2>
          <p className="text-neutral-700 text-sm mb-4">
            Our most powerful search, ideal for longer answers to complex
            questions
          </p>
          <button className="bg-background-weak text-default px-4 py-2 rounded-md hover:bg-hover-lightish transition-colors duration-300">
            Learn More
          </button>
        </div>
      }
    >
      <div
        ref={containerRef}
        className=" my-auto ml-auto flex jusitfy-end items-center cursor-pointer transition-all duration-300 ease-in-out overflow-hidden"
        style={{ width }}
        onClick={handleToggle}
      >
        <div
          ref={contentRef}
          className={`flex group ml-auto items-center transition-all duration-300 ease-in-out ${!isOn ? "" : "ml-auto"}`}
        >
          <span
            className={`text-sm transition-all duration-300 ease-in-out ${isOn ? "opacity-100 translate-x-0 mr-2" : "opacity-0 -translate-x-full w-0"}`}
          >
            Agentic
          </span>

          <div
            className={`
            w-10 h-6 flex items-center rounded-full p-1 transition-all duration-300 ease-in-out
            ${isOn ? "bg-neutral-200" : "bg-neutral-400"}
          `}
          >
            <div
              className={`
              bg-white w-4 h-4 rounded-full group-hover:scale-[.8] shadow-md transform transition-all duration-300 ease-in-out
              ${!isOn ? "" : "translate-x-4"}
            `}
            ></div>
          </div>
          <span
            className={`no-underline text-sm transition-all duration-300 ease-in-out ${isOn ? "opacity-0 translate-x-full w-0" : "opacity-100 translate-x-0 ml-2"}`}
          >
            Fast
          </span>
        </div>
      </div>
    </Tooltip>
  );
};

export default AnimatedToggle;

export const FullSearchBar = ({
  searchState,
  query,
  setQuery,
  onSearch,
  agentic,
  toggleAgentic,
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
    if (event.key === "Enter" && !event.shiftKey) {
      onSearch(agentic);
      event.preventDefault();
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
        bg-background-weak
        [&:has(textarea:focus)]::ring-1
        [&:has(textarea:focus)]::ring-black
        "
    >
      <textarea
        rows={3}
        onKeyDownCapture={handleKeyDown}
        className={`
                m-0
                w-full
                shrink
                resize-none
                border-0
                bg-background-weak
                whitespace-normal
                rounded-lg
                break-word
                overscroll-contain
                outline-none
                placeholder-subtle
                resize-none
                pl-4
                pr-12
                max-h-[6em]
                py-4
                h-14
              `}
        autoFocus
        style={{ scrollbarWidth: "thin" }}
        role="textarea"
        aria-multiline
        placeholder="Search for something..."
        value={query}
        onChange={handleChange}
        onKeyDown={(event) => {}}
        suppressContentEditableWarning={true}
      />

      <div className="flex justify-end w-full items-center space-x-3 mr-12 px-4  pb-2 ">
        {searchState == "searching" && (
          <div className="mr-auto relative inline-block">
            <span className="loading-text">Reading Documents...</span>
          </div>
        )}
        {searchState == "analyzing" && (
          <div className="mr-auto relative inline-block">
            <span className="loading-text">Generating Analysis...</span>
          </div>
        )}

        {toggleAgentic && (
          <AnimatedToggle isOn={agentic!} handleToggle={toggleAgentic} />
        )}

        <div className="my-auto pl-2">
          <button
            onClick={() => {
              onSearch(agentic);
            }}
            className=" flex  my-auto cursor-pointer"
          >
            <SendIcon
              className={`text-emphasis text-white !w-7 !h-7 p-1 rounded-full ${
                query ? "bg-neutral-700" : "bg-[#D7D7D7]"
              }`}
            />
          </button>
        </div>
      </div>
      <div className="absolute bottom-2.5 right-10"></div>
    </div>
  );
};

interface SearchBarProps {
  query: string;
  setQuery: (query: string) => void;
  onSearch: () => void;
}

export const SearchBar = ({ query, setQuery, onSearch }: SearchBarProps) => {
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const target = event.target;
    setQuery(target.value);

    // Resize the textarea to fit the content
    target.style.height = "24px";
    const newHeight = target.scrollHeight;
    target.style.height = `${newHeight}px`;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      onSearch();
      event.preventDefault();
    }
  };

  return (
    <div className="flex justify-center">
      <div className="flex items-center w-full opacity-100 border-2 border-border rounded-lg px-4 py-2 focus-within:border-accent bg-background-search">
        <MagnifyingGlass className="text-emphasis" />
        <textarea
          autoFocus
          className="flex-grow ml-2 h-6 outline-none placeholder-default overflow-hidden whitespace-normal resize-none"
          role="textarea"
          aria-multiline
          placeholder="Search..."
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          suppressContentEditableWarning={true}
        />
      </div>
    </div>
  );
};
