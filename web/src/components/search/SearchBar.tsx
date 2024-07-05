import React, { KeyboardEvent, ChangeEvent } from "react";
import { searchState } from "./SearchSection";

interface SearchBarProps {
  query: string;
  setQuery: (query: string) => void;
  onSearch: (fast?: boolean) => void;
  searchState?: searchState;
  agentic?: boolean;
  toggleAgentic?: () => void;
}

const AnimatedToggle = ({
  isOn,
  handleToggle,
}: {
  isOn: boolean;
  handleToggle: () => void;
}) => {
  return (
    <div className="flex items-center cursor-pointer" onClick={handleToggle}>
      <div
        className={`
        w-10 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out
        ${isOn ? "bg-neutral-400" : "bg-neutral-200"}
      `}
      >
        <div
          className={`
          bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out
          ${isOn ? "translate-x-4" : ""}
        `}
        ></div>
      </div>
      <span className="ml-2 text-sm">
        Agentic
        {/* {isOn ? 'Fast' : 'Normal'} */}
      </span>
    </div>
  );
};

export default AnimatedToggle;

export const SearchBar = ({
  searchState,
  query,
  setQuery,
  onSearch,
  agentic,
  toggleAgentic,
}: SearchBarProps) => {
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
        overflow-hidden
        bg-background-weak
        [&:has(textarea:focus)]::ring-1
        [&:has(textarea:focus)]::ring-black
        "
    >
      <textarea
        onKeyDownCapture={handleKeyDown}
        className={`
                m-0
                w-full
                shrink
                resize-none
                border-0
                bg-background-weak
                overflow-hidden
                whitespace-normal
                break-word
                overscroll-contain
                outline-none
                placeholder-subtle
                overflow-hidden
                resize-none
                pl-4
                pr-12
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

      <div className="flex justify-end w-full items-center space-x-3 mr-12 px-4  pb-2 overflow-hidden">
        {searchState == "analyzing" && (
          <div className="mr-auto relative inline-block">
            <span className=" text-transparent bg-clip-text bg-gradient-to-r from-black to-black via-neutral-10 animate-shimmer">
              Analyzing text...
            </span>
          </div>
        )}
        {searchState == "searching" && (
          <div className="mr-auto relative inline-block">
            <span className=" text-transparent bg-clip-text bg-gradient-to-r from-black to-black via-neutral-10 animate-shimmer">
              Searching...
            </span>
          </div>
        )}
        {toggleAgentic && (
          <AnimatedToggle isOn={agentic!} handleToggle={toggleAgentic} />
        )}
      </div>
      <div className="absolute bottom-2.5 right-10"></div>
    </div>
  );
};
