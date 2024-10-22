import { format } from "date-fns";
import { Calendar as CalendarIcon, CircleX } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterManager } from "@/lib/hooks";
import { HTMLAttributes, useEffect, useState } from "react";

export function FilterDatePicker({
  filterManager,
}: HTMLAttributes<HTMLDivElement> & {
  filterManager: FilterManager;
}) {
  const { timeRange, setTimeRange } = filterManager;
  const [calendarValue, setCalendarValue] = useState<DateRange | undefined>(
    undefined
  );
  const [selectValue, setSelectValue] = useState<string>("");

  const millisecondsInDays = (days: number): number =>
    days * 24 * 60 * 60 * 1000;

  const isDateRangeEqualToDays = (
    fromDate: Date,
    toDate: Date,
    days: number
  ): boolean => {
    return toDate.getTime() - fromDate.getTime() === millisecondsInDays(days);
  };

  useEffect(() => {
    if (timeRange) {
      setCalendarValue({ from: timeRange.from, to: timeRange.to });

      const today = new Date();
      const fromDateString = timeRange.from!.toDateString();

      if (fromDateString === today.toDateString()) {
        setSelectValue("Today");
      } else if (isDateRangeEqualToDays(timeRange.from!, timeRange.to!, 7)) {
        setSelectValue("Last 7 days");
      } else if (isDateRangeEqualToDays(timeRange.from!, timeRange.to!, 30)) {
        setSelectValue("Last 30 days");
      } else {
        setSelectValue("");
      }
    } else {
      setCalendarValue(undefined);
      setSelectValue("");
    }
  }, [timeRange]);

  const handleSelectChange = (value: string) => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (value) {
      case "Last 30 days":
        startDate = getXDaysAgo(30);
        endDate = now;
        break;
      case "Last 7 days":
        startDate = getXDaysAgo(7);
        endDate = now;
        break;
      case "Today":
        startDate = now;
        endDate = now; // Set end date to today
        break;
      default:
        return;
    }

    const newDate = { from: startDate, to: endDate };
    setSelectValue(value);
    setCalendarValue(newDate);
    setTimeRange(newDate);
  };

  const handleDateSelect = (newDate: DateRange | undefined) => {
    setCalendarValue(newDate);
    setTimeRange(newDate ? { from: newDate.from, to: newDate.to } : null);

    if (newDate) {
      setSelectValue(""); // Reset selectValue when calendarValue changes
    }
  };

  const getXDaysAgo = (daysAgo: number) => {
    const today = new Date();
    const daysAgoDate = new Date(today);
    daysAgoDate.setDate(today.getDate() - daysAgo);
    return daysAgoDate;
  };

  const handleResetDateRange = () => {
    setCalendarValue(undefined);
    setTimeRange(null);
    setSelectValue("");
  };

  return (
    <div className="flex gap-0.5">
      <Popover>
        <PopoverTrigger asChild>
          <div className="relative">
            <Button
              id="date"
              variant={"outline"}
              className={cn(
                "sm:w-[300px] justify-start text-left font-normal !rounded-r-none !border-input relative",
                !calendarValue && "text-muted-foreground"
              )}
            >
              <CalendarIcon size={16} className="mr-2 h-4 w-4" />
              {calendarValue?.from
                ? selectValue === "Today"
                  ? `${format(calendarValue.from, "LLL dd, y")}` // Show only the start date for Today
                  : calendarValue.to // Ensure the to date is valid before formatting
                    ? `${format(calendarValue.from, "LLL dd, y")} - ${format(
                        calendarValue.to,
                        "LLL dd, y"
                      )}`
                    : `${format(calendarValue.from, "LLL dd, y")}` // Fallback for invalid to date
                : "Select Range"}
            </Button>

            {calendarValue?.from && calendarValue?.to && (
              <CircleX
                size={16}
                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
                onClick={handleResetDateRange}
              />
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 !z-notification" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={calendarValue?.from}
            selected={calendarValue}
            onSelect={handleDateSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      <Select value={selectValue} onValueChange={handleSelectChange}>
        <SelectTrigger className="md:w-[150px] rounded-l-none !rounded-r-regular">
          <SelectValue placeholder="Select Range" />
        </SelectTrigger>
        <SelectContent className="z-notification">
          <SelectItem value="Last 30 days">Last 30 Days</SelectItem>
          <SelectItem value="Last 7 days">Last 7 Days</SelectItem>
          <SelectItem value="Today">Today</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
