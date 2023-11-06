import { getXDaysAgo } from "@/lib/dateUtils";
import { DateRangePickerValue } from "@tremor/react";
import { FiCalendar, FiChevronDown, FiXCircle } from "react-icons/fi";
import { CustomDropdown } from "../Dropdown";

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
      text-white 
      hover:bg-dark-tremor-background-muted 
      py-2.5 
      select-none 
      cursor-pointer 
      ${skipBottomBorder ? "" : "border-b border-gray-900"} 
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function DateRangeSelector({
  value,
  onValueChange,
}: {
  value: DateRangePickerValue | null;
  onValueChange: (value: DateRangePickerValue | null) => void;
}) {
  return (
    <div>
      <CustomDropdown
        dropdown={
          <div className="border border-gray-200 rounded-lg flex flex-col">
            <DateSelectorItem
              onClick={() =>
                onValueChange({
                  to: new Date(),
                  from: getXDaysAgo(30),
                  selectValue: "Last 30 days",
                })
              }
            >
              Last 30 days
            </DateSelectorItem>
            <DateSelectorItem
              onClick={() =>
                onValueChange({
                  to: new Date(),
                  from: getXDaysAgo(7),
                  selectValue: "Last 7 days",
                })
              }
            >
              Last 7 days
            </DateSelectorItem>
            <DateSelectorItem
              onClick={() =>
                onValueChange({
                  to: new Date(),
                  from: getXDaysAgo(1),
                  selectValue: "Today",
                })
              }
              skipBottomBorder={true}
            >
              Today
            </DateSelectorItem>
          </div>
        }
      >
        <div
          className={`
              flex 
              text-sm 
              text-gray-400 
              px-3
              py-1.5 
              rounded-lg 
              border 
              border-gray-800 
              cursor-pointer 
              hover:bg-dark-tremor-background-muted`}
        >
          <FiCalendar className="my-auto mr-2 text-gray-500" />{" "}
          {value?.selectValue ? (
            <div className="text-gray-200">{value.selectValue}</div>
          ) : (
            "Any time..."
          )}
          {value?.selectValue ? (
            <div
              className="my-auto ml-auto hover:text-gray-300 hover:bg-gray-700 p-0.5 rounded-full w-fit"
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
