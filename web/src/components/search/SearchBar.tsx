import React, { KeyboardEvent, ChangeEvent, useState } from "react";
import { MagnifyingGlass, ToggleLeft } from "@phosphor-icons/react";
import ChatInputOption from "@/app/chat/input/ChatInputOption";
import { FiCalendar, FiCamera, FiPlusCircle, FiSend } from "react-icons/fi";
import { FaBrain } from "react-icons/fa";
import { InputBarPreview } from "@/app/chat/files/InputBarPreview";
import { Icon } from "@tremor/react";

interface SearchBarProps {
  query: string;
  setQuery: (query: string) => void;
  onSearch: () => void;
}

// import React from 'react';
// import { Switch } from 'lucide-react';'
const AnimatedToggle = ({ isOn, handleToggle }: { isOn: boolean, handleToggle: () => void }) => {
  return (
    <div
      className="flex items-center cursor-pointer"
      onClick={handleToggle}
    >
      <div className={`
        w-14 h-7 flex items-center rounded-full p-1 duration-300 ease-in-out
        ${isOn ? 'bg-neutral-400' : 'bg-neutral-200'}
      `}>
        <div className={`
          bg-white w-5 h-5 rounded-full shadow-md transform duration-300 ease-in-out
          ${isOn ? 'translate-x-7' : ''}
        `}></div>
      </div>
      <span className="ml-2 text-sm">
        Agentic Search
        {/* {isOn ? 'Fast' : 'Normal'} */}
      </span>
    </div>
  );
};

export default AnimatedToggle;




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

  const [fast, setFast] = useState(false)

  const handleToggle = () => {
    setFast(!fast);
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

            ? "overflow-y-auto mt-2"
            : ""
          }
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
        placeholder="Send a message..."

        value={query}
        onChange={handleChange}
        onKeyDown={(event) => {

        }}
        suppressContentEditableWarning={true}
      />
      <div className="flex justify-end w-full items-center space-x-3 mr-12 px-4  pb-2 overflow-hidden">



        <AnimatedToggle isOn={fast} handleToggle={handleToggle} />


        {/* <Icon icon={FiCamera} size="sm" className="flex-none" /> */}





      </div>
      <div className="absolute bottom-2.5 right-10">
      </div>
    </div>
    // <div className="flex justify-center">
    //   <div className="flex mx-auto items-center w-full opacity-100 border-2 border-border rounded-lg px-4 py-2 focus-within:border-accent bg-background-weak">
    //     <MagnifyingGlass className="text-emphasis" />
    //     <textarea
    //       autoFocus
    //       className="flex-grow bg-background-weak ml-2 h-6 outline-none placeholder-default overflow-hidden whitespace-normal resize-none"
    //       role="textarea"
    //       aria-multiline
    //       placeholder="Search..."
    //       value={query}
    //       onChange={handleChange}
    //       onKeyDown={handleKeyDown}
    //       suppressContentEditableWarning={true}
    //     />
    //   </div>
    // </div>
  );
};
