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
  fullText1?: boolean
  fullText2?: boolean
  fullText3?: boolean
}

const ChatInputOption = ({
  name,
  icon: Icon,
  onClick,
  size = 16,
  options,
  fullText1,
  fullText2,
  fullText3
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
    // <div className="relative w-fit">
    <div
      className={`
        
          ${fullText1 && "flex-shrink-[10000] flex-grow-0 flex-basis-auto min-w-[3px] whitespace-nowrap overflow-hidden text-ellipsis"}
          ${fullText2 && "flex-shrink flex-grow flex-basis-0 min-w-[30px] whitespace-nowrap overflow-hidden text-ellipsis"}
          ${fullText3 && "flex-none w-[500px] bg-black whitespace-nowrap overflow-hidden text-ellipsis"}
          bg-black
        `}
      onClick={handleClick}
      title={name}
    >
      {fullText1 && "1111111111111111111111111111"}
      {fullText1 && "2222222222222222222222222222"}
      {fullText1 && "3333333333333333333333333333"}
      {/* <Icon size={size} className="flex-none" />
        <span className={`text-sm  break-all line-clamp-1 `}>{name}</span> */}
    </div>
    // </div>
  );

  if (!dropdownContent) {
    return <div onClick={onClick}>{option}</div>;
  }

  return (
    <div
      className={`
        flex-none w-[500px] bg-black whitespace-nowrap overflow-hidden text-ellipsis
        
        `}
      onClick={handleClick}
      title={name}
    >
      zzzz
      test
      {fullText1 && "1111111111111111111111111111"}
      {fullText2 && "2222222222222222222222222222"}
      {fullText3 && "3333333333333333333333333333"}
      {/* <Icon size={size} className="flex-none" />
        <span className={`text-sm  break-all line-clamp-1 `}>{name}</span> */}
    </div>
    // {option}
    // <Popover
    //   open={isDropupVisible}
    //   onOpenChange={setDropupVisible}
    //   content={option}
    //   popover={dropdownContent}
    //   side="top"
    //   align="start"
    //   sideOffset={5}
    // />
  );
};

export default ChatInputOption;

