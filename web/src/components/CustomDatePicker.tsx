import { getXDaysAgo } from "@/lib/dateUtils";
import { DateRange } from "react-day-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { Button } from "./ui/button";
import { format } from "date-fns";
import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";

interface PredefinedRange {
  value: string;
  label: string;
}

interface CustomDatePickerProps {
  value: DateRange | undefined;
  onValueChange: (value: DateRange) => void;
  predefinedRanges: PredefinedRange[];
}

export function CustomDatePicker({
  value,
  onValueChange,
  predefinedRanges,
}: CustomDatePickerProps) {
  const [selectedRange, setSelectedRange] = useState<string>(
    predefinedRanges[0]?.value || ""
  );

  const getDateRange = (range: string): DateRange => {
    const today = new Date();
    let start: Date | undefined, end: Date | undefined;

    switch (range) {
      case "7d":
        start = getXDaysAgo(7);
        end = today;
        break;
      case "30d":
        start = getXDaysAgo(30);
        end = today;
        break;
      case "today":
        start = today;
        end = today;
        break;
      case "allTime":
        start = new Date("1970-01-01");
        end = today;
        break;
      case "lastYear":
        start = new Date(
          today.getFullYear() - 1,
          today.getMonth(),
          today.getDate()
        );
        end = today;
        break;
      default:
        start = undefined;
        end = undefined;
        break;
    }

    return { from: start, to: end };
  };

  const handleSelectDateRange = (range: DateRange | undefined) => {
    if (range) {
      onValueChange(range);
    } else {
      const defaultRange = getDateRange(selectedRange);
      onValueChange(defaultRange);
    }
    setSelectedRange("");
  };

  const handleSelectPredefinedRange = (range: string) => {
    setSelectedRange(range);
    const dateRange = getDateRange(range);
    onValueChange(dateRange);
  };

  const calendarValue = value || getDateRange(selectedRange);
  const displayRange = calendarValue.from
    ? `${format(calendarValue.from, "LLL dd, y")}${
        calendarValue.to ? ` - ${format(calendarValue.to, "LLL dd, y")}` : ""
      }`
    : "Select Range";

  const disablePastDates = (date: Date) => {
    return date > new Date();
  };

  return (
    <div className="flex">
      <Popover>
        <PopoverTrigger asChild className="md:w-72 items-start justify-start">
          <Button
            variant="outline"
            className="rounded-r-none items-center gap-2"
          >
            <CalendarIcon size={16} />
            {displayRange}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start">
          <Calendar
            mode="range"
            selected={calendarValue}
            onSelect={handleSelectDateRange}
            numberOfMonths={2}
            disabled={disablePastDates}
          />
        </PopoverContent>
      </Popover>

      <Select value={selectedRange} onValueChange={handleSelectPredefinedRange}>
        <SelectTrigger className="md:w-40 rounded-l-none !rounded-r-regular">
          <SelectValue placeholder="Select range" />
        </SelectTrigger>
        <SelectContent>
          {predefinedRanges.map(({ value, label }) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
