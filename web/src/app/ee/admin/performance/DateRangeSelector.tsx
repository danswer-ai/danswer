import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { getXDaysAgo } from "./dateUtils";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

export const THIRTY_DAYS = "30d";

export type DateRangePickerValue = DateRange & {
  selectValue: string;
};

export type DateRange =
  | {
      from: Date;
      to: Date;
    }
  | undefined;

export function DateRangeSelector({
  value,
  onValueChange,
}: {
  value: DateRange;
  onValueChange: (value: DateRange) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const presets = [
    {
      label: "Last 30 days",
      value: {
        from: getXDaysAgo(30),
        to: getXDaysAgo(0),
      },
    },
    {
      label: "Today",
      value: {
        from: getXDaysAgo(1),
        to: getXDaysAgo(0),
      },
    },
  ];

  return (
    <div className="grid gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, "LLL dd, y")} -{" "}
                  {format(value.to, "LLL dd, y")}
                </>
              ) : (
                format(value.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={onValueChange}
            numberOfMonths={2}
          />
          <div className="border-t p-3">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  onValueChange(preset.value);
                  setIsOpen(false);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface DateRangePickerItemProps {
  value: string;
  from: Date;
  to?: Date;
  children: React.ReactNode;
}

interface DateRangePickerProps {
  value?: DateRangePickerValue;
  onValueChange?: (value: DateRangePickerValue) => void;
  maxDate?: Date;
  defaultValue?: DateRangePickerValue;
  className?: string;
  enableClear?: boolean;
  selectPlaceholder?: string;
  children?: React.ReactNode;
}

export function DateRangePickerItem({
  value,
  from,
  to,
  children,
}: DateRangePickerItemProps) {
  return null;
}

export function DateRangePicker({
  value,
  onValueChange,
  maxDate,
  defaultValue,
  className,
  enableClear = true,
  selectPlaceholder = "Select range",
  children,
}: DateRangePickerProps) {
  const [localValue, setLocalValue] = useState<DateRangePickerValue>(
    defaultValue || {
      from: undefined,
      to: undefined,
      selectValue: undefined,
    }
  );

  const handleValueChange = (newValue: DateRangePickerValue) => {
    setLocalValue(newValue);
    onValueChange?.(newValue);
  };

  // Extract preset options from children
  const presetOptions = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && child.type === DateRangePickerItem) {
      return {
        label: child.props.children,
        value: {
          from: child.props.from,
          to: child.props.to || maxDate || new Date(),
          selectValue: child.props.value,
        },
      };
    }
    return null;
  })?.filter(Boolean);

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.selectValue ? (
              presetOptions?.find(
                (opt) => opt.value.selectValue === value.selectValue
              )?.label
            ) : value?.from ? (
              value.to ? (
                <>
                  {format(value.from, "LLL dd, y")} -{" "}
                  {format(value.to, "LLL dd, y")}
                </>
              ) : (
                format(value.from, "LLL dd, y")
              )
            ) : (
              <span>{selectPlaceholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="space-y-4 p-3">
            {presetOptions?.map((preset) => (
              <Button
                key={preset.value.selectValue}
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleValueChange(preset.value)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <Separator className="my-2" />
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={value?.from}
            selected={{ from: value?.from, to: value?.to }}
            onSelect={(range) =>
              handleValueChange({
                from: range?.from,
                to: range?.to,
                selectValue: undefined,
              })
            }
            numberOfMonths={2}
            max={maxDate}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
