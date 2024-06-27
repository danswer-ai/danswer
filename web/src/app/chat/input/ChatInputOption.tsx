import React, { useState } from "react";
import { IconType } from "react-icons";
import { DefaultDropdownElement } from "../../../components/Dropdown";
import { Popover } from "../../../components/popover/Popover";

interface ChatInputOptionProps {
  name: string;
  icon: IconType;
  onClick: () => void;
  size?: number;

  options?: { name: string; value: number; onClick?: () => void }[];
  flexPriority?: "shrink" | "stiff" | "second";
}

const ChatInputOption = ({
  name,
  icon: Icon,
  onClick,
  size = 16,
  options,
  flexPriority,
}: ChatInputOptionProps) => {
  const [isDropupVisible, setDropupVisible] = useState(false);

  const handleClick = () => {
    setDropupVisible(!isDropupVisible);
    // onClick();
  };

  const dropdownContent = options ? (
    <div
      className={`
        border 
        border 
        rounded-lg 
        flex 
        flex-col 
        bg-background
        overflow-y-auto 
        overscroll-contain`}
    >
      {options.map((option) => (
        <DefaultDropdownElement
          key={option.value}
          name={option.name}
          onSelect={() => {
            if (option.onClick) {
              option.onClick();
              setDropupVisible(false);
            }
          }}
          isSelected={false}
        />
      ))}
    </div>
  ) : null;

  const option = (
    <div className="relative w-fit">
      <div
        className="
          cursor-pointer 
          flex 
          items-center 
          space-x-2 
          text-subtle
          hover:bg-hover
          hover:text-emphasis
          p-1.5
          rounded-md
        "
        onClick={handleClick}
        title={name}
      >
        <Icon size={size} className="flex-none" />
        <span className="text-sm break-all line-clamp-1">{name}</span>
      </div>
    </div>
  );

  if (!dropdownContent) {
    return (
      <div
        onClick={onClick}
        className={`text-ellipsis
          ${flexPriority == "shrink" && "flex-shrink-[10000] flex-grow-0 flex-basis-auto min-w-[30px] whitespace-nowrap overflow-hidden"}
          ${flexPriority == "second" && "flex-shrink flex-basis-0 min-w-[30px] whitespace-nowrap overflow-hidden"}
          ${flexPriority == "stiff" && "flex-none whitespace-nowrap overflow-hidden"}
          `}
      >
        {option}
      </div>
    );
  }

  return (
    <Popover
      open={isDropupVisible}
      onOpenChange={setDropupVisible}
      content={option}
      popover={dropdownContent}
      side="top"
      align="start"
      sideOffset={5}
    />
  );
};

export default ChatInputOption;
