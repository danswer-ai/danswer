import { DateRangePickerValue } from "@tremor/react";
import { FiCalendar, FiChevronDown, FiXCircle } from "react-icons/fi";
import { CustomDropdown } from "../Dropdown";
import { timeRangeValues } from "@/app/config/timeRange";
import { TimeRangeSelector } from "@/components/filters/timeRangeFilter";
function DateSelectorItem({
  children,
  onClick,
  skipBottomBorder,
}: {
  children: string | JSX.Element;
  onClick?: () => void;
  skipBottomBorder?: boolean;
}) {
  return (
    <div
      className={`
      px-3 
      text-sm 
      bg-background
      hover:bg-hover 
      py-2.5 
      select-none 
      cursor-pointer 
      ${skipBottomBorder ? "" : "border-b border-border"} 
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}


export const LAST_30_DAYS = "Last 30 days";
export const LAST_7_DAYS = "Last 7 days";
export const TODAY = "Today";

export function DateRangeSelector({
  value,
  onValueChange,
  isHorizontal,
}: {
  value: DateRangePickerValue | null;
  onValueChange: (value: DateRangePickerValue | null) => void;
  isHorizontal?: boolean;
}) {
  return (
    <div>
      <CustomDropdown
        dropdown={
          <TimeRangeSelector
            value={value}
            className={`
            border
            border-border
            bg-background
            rounded-lg
            flex
            flex-col
            w-64
            max-h-96
            overflow-y-auto
            flex
            overscroll-contain`}
            timeRangeValues={timeRangeValues}
            onValueChange={onValueChange}
          />
        }
      >
        <div
          className={`
            flex 
            text-sm  
            px-3
            line-clamp-1
            py-1.5 
            rounded-lg 
            border 
            border-border 
            cursor-pointer 
            hover:bg-hover`}
        >
          <FiCalendar className="flex-none my-auto mr-2" />{" "}
          <p className="line-clamp-1">
            {isHorizontal ? (
              "Date"
            ) : value?.selectValue ? (
              <div className="text-emphasis">{value.selectValue}</div>
            ) : (
              "Any time..."
            )}
          </p>
          {value?.selectValue ? (
            <div
              className="my-auto ml-auto p-0.5 rounded-full w-fit"
              onClick={(e) => {
                onValueChange(null);
                e.stopPropagation();
              }}
            >
              <FiXCircle />
            </div>
          ) : (
            <FiChevronDown className="my-auto ml-auto" />
          )}
        </div>
      </CustomDropdown>
    </div>
  );
}
