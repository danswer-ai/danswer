/* import { getXDaysAgo } from "@/lib/dateUtils";
import { DateRangePickerValue } from "@tremor/react";
import { FiCalendar, FiChevronDown, FiXCircle } from "react-icons/fi";
import { CustomDropdown, DefaultDropdownElement } from "../Dropdown";

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
}: {
  value: DateRangePickerValue | null;
  onValueChange: (value: DateRangePickerValue | null) => void;
}) {
  return (
    <div>
      <CustomDropdown
        dropdown={
          <div
            className={`
              border 
              border-border 
              bg-background
              rounded-regular 
              flex-col 
              w-64 
              max-h-96 
              overflow-y-auto 
              flex
              overscroll-contain`}
          >
            <DefaultDropdownElement
              key={LAST_30_DAYS}
              name={LAST_30_DAYS}
              onSelect={() =>
                onValueChange({
                  to: new Date(),
                  from: getXDaysAgo(30),
                  selectValue: LAST_30_DAYS,
                })
              }
              isSelected={value?.selectValue === LAST_30_DAYS}
            />

            <DefaultDropdownElement
              key={LAST_7_DAYS}
              name={LAST_7_DAYS}
              onSelect={() =>
                onValueChange({
                  to: new Date(),
                  from: getXDaysAgo(7),
                  selectValue: LAST_7_DAYS,
                })
              }
              isSelected={value?.selectValue === LAST_7_DAYS}
            />

            <DefaultDropdownElement
              key={TODAY}
              name={TODAY}
              onSelect={() =>
                onValueChange({
                  to: new Date(),
                  from: getXDaysAgo(1),
                  selectValue: TODAY,
                })
              }
              isSelected={value?.selectValue === TODAY}
            />
          </div>
        }
      >
        <div
          className={`
              flex 
              text-sm  
              px-3
              py-1.5 
              rounded-regular 
              border 
              border-border 
              cursor-pointer 
              hover:bg-hover`}
        >
          <FiCalendar className="my-auto mr-2" />{" "}
          {value?.selectValue ? (
            <div className="text-emphasis">{value.selectValue}</div>
          ) : (
            "Any time..."
          )}
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
} */

/* import { getXDaysAgo } from "@/lib/dateUtils";
import { DateRangePickerValue } from "@tremor/react";
import { FiCalendar, FiXCircle } from "react-icons/fi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

type DateRangeSelectorProps = {
  value: DateRangePickerValue | null;
  onValueChange: (value: DateRangePickerValue | null) => void;
};

export function DateRangeSelector({
  value,
  onValueChange,
}: DateRangeSelectorProps) {
  const formatSelectItem = (key: string, label: string, fromDate: Date) => (
    <SelectItem
      key={key}
      value={label}
      className="flex items-center"
      onClick={() =>
        onValueChange({ to: new Date(), from: fromDate, selectValue: key })
      }
    >
      {label}
    </SelectItem>
  );

  return (
    <div className="relative">
      {value?.selectValue && (
        <button
          className="absolute right-3 top-3 bg-white z-[1000]"
          onClick={(e) => {
            e.stopPropagation();
            onValueChange(null);
          }}
        >
          <FiXCircle size={16} />
        </button>
      )}
      <Select
        value={value?.selectValue || ""}
        onValueChange={(selectedValue) => {
          if (selectedValue) {
            const dateMappings: { [key: string]: Date } = {
              LAST_30_DAYS: getXDaysAgo(30),
              LAST_7_DAYS: getXDaysAgo(7),
              TODAY: getXDaysAgo(1),
            };
            onValueChange({
              to: new Date(),
              from: dateMappings[selectedValue],
              selectValue: selectedValue,
            });
          } else {
            onValueChange(null);
          }
        }}
        defaultValue=""
      >
        <SelectTrigger className="w-40 relative">
          <div className="flex items-center gap-3">
            <SelectValue placeholder="Date" />
          </div>
        </SelectTrigger>

        <SelectContent
          side="bottom"
          align="end"
          className="border border-border bg-background rounded-regular flex-col w-52 max-h-96 overflow-y-auto flex overscroll-contain"
        >
          {formatSelectItem("LAST_30_DAYS", "Last 30 Days", getXDaysAgo(30))}
          {formatSelectItem("LAST_7_DAYS", "Last 7 Days", getXDaysAgo(7))}
          {formatSelectItem("TODAY", "Today", getXDaysAgo(1))}
        </SelectContent>
      </Select>
    </div>
  );
} */
import { getXDaysAgo } from "@/lib/dateUtils";
import { DateRangePickerValue } from "@tremor/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DateRangeSelectorProps = {
  value: DateRangePickerValue | null;
  onValueChange: (value: DateRangePickerValue | null) => void;
};

export function DateRangeSelector({
  value,
  onValueChange,
}: DateRangeSelectorProps) {
  const formatSelectItem = (key: string, label: string, fromDate: Date) => (
    <SelectItem
      key={key}
      value={label}
      className="flex items-center"
      onClick={() =>
        onValueChange({ to: new Date(), from: fromDate, selectValue: key })
      }
    >
      {label}
    </SelectItem>
  );

  return (
    <Select
      value={value?.selectValue || ""}
      onValueChange={(selectedValue) => {
        if (selectedValue) {
          const dateMappings: { [key: string]: Date } = {
            LAST_30_DAYS: getXDaysAgo(30),
            LAST_7_DAYS: getXDaysAgo(7),
            TODAY: getXDaysAgo(1),
          };
          onValueChange({
            to: new Date(),
            from: dateMappings[selectedValue],
            selectValue: selectedValue,
          });
        } else {
          onValueChange(null);
        }
      }}
      defaultValue=""
    >
      <SelectTrigger className="w-1/2 md:w-36">
        <SelectValue placeholder="Date" className="text-start" />
      </SelectTrigger>

      <SelectContent side="bottom" align="end">
        {formatSelectItem("LAST_30_DAYS", "Last 30 Days", getXDaysAgo(30))}
        {formatSelectItem("LAST_7_DAYS", "Last 7 Days", getXDaysAgo(7))}
        {formatSelectItem("TODAY", "Today", getXDaysAgo(1))}
      </SelectContent>
    </Select>
  );
}
