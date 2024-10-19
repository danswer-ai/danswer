import { FiXCircle } from "react-icons/fi";
import { CustomDropdown } from "../../Dropdown";
import { Check, ChevronDown } from "lucide-react";

interface Option {
  key: string;
  display: string | JSX.Element;
  displayName?: string;
}
export function FilterDropdown({
  options,
  selected,
  handleSelect,
  icon,
  defaultDisplay,
  width = "w-64",
  dropdownWidth,
  optionClassName,
  resetValues,
}: {
  options: Option[];
  selected: string[];
  handleSelect: (option: Option) => void;
  icon: JSX.Element;
  defaultDisplay: string | JSX.Element;
  width?: string;
  dropdownWidth?: string;
  optionClassName?: string;
  resetValues?: () => void;
}) {
  return (
    <div>
      <CustomDropdown
        dropdown={
          <div
            className={`
          border 
          border-border 
          rounded-regular 
          bg-background
          flex 
          flex-col 
          w-64 
          max-h-96 
          overflow-y-auto 
          overscroll-contain
          ${dropdownWidth || width}`}
          >
            {options.map((option, ind) => {
              const isSelected = selected.includes(option.key);
              return (
                <div
                  key={`${option.key}-1`}
                  className={`
                    ${optionClassName}
                    flex
                    px-3 
                    text-sm 
                    py-2.5 
                    select-none 
                    cursor-pointer 
                    
                    hover:bg-hover-light
                    ${
                      ind === options.length - 1 ? "" : "border-b border-border"
                    } 
                  `}
                  onClick={(event) => {
                    handleSelect(option);
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                >
                  {option.display}
                  {isSelected && (
                    <div className="ml-auto mr-1">
                      <Check />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        }
      >
        <div
          className={`
        flex 
        w-64
        text-sm 
        px-3
        py-1.5 
        rounded-regular 
        border 
        border-border
        cursor-pointer 
        hover:bg-hover-light`}
        >
          <div className="flex-none my-auto">{icon}</div>
          {selected.length === 0 || resetValues ? (
            defaultDisplay
          ) : (
            <p className="line-clamp-1">{selected.join(", ")}</p>
          )}
          {resetValues && selected.length !== 0 ? (
            <div
              className="my-auto ml-auto p-0.5 rounded-full w-fit"
              onClick={(e) => {
                resetValues();
                e.stopPropagation();
              }}
            >
              <FiXCircle />
            </div>
          ) : (
            <ChevronDown className="my-auto ml-auto" />
          )}
        </div>
      </CustomDropdown>
    </div>
  );
}
