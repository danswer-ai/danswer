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
import { useState, useEffect } from "react";
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

const normalizeToUTC = (date: Date) => {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
};

export function CustomDatePicker({
  value,
  onValueChange,
  predefinedRanges,
}: CustomDatePickerProps) {
  const [selectedRange, setSelectedRange] = useState<string>(
    predefinedRanges[0]?.value || ""
  );

  const getDateRange = (range: string): DateRange => {
    const today = normalizeToUTC(new Date());

    switch (range) {
      case "7d":
        return { from: normalizeToUTC(getXDaysAgo(7)), to: today };
      case "30d":
        return { from: normalizeToUTC(getXDaysAgo(30)), to: today };
      case "today":
        return { from: today, to: today };
      case "allTime":
        return { from: normalizeToUTC(new Date("1970-01-01")), to: today };
      case "lastYear":
        return {
          from: normalizeToUTC(
            new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
          ),
          to: today,
        };
      default:
        return { from: undefined, to: undefined };
    }
  };

  useEffect(() => {
    if (value === undefined) {
      onValueChange(getDateRange(selectedRange));
    }
  }, [selectedRange, value, onValueChange]);

  const handleSelectPredefinedRange = (range: string) => {
    setSelectedRange(range);
    onValueChange(getDateRange(range));
  };

  const handleSelectDateRange = (range: DateRange | undefined) => {
    if (range) {
      onValueChange(range);
      setSelectedRange("");
    }
  };

  const displayRange = value?.from
    ? `${format(value.from, "LLL dd, y")}${
        value.to ? ` - ${format(value.to, "LLL dd, y")}` : ""
      }`
    : "Select Range";

  const disablePastDates = (date: Date) => date > new Date();

  return (
    <div className="flex">
      <Popover>
        <PopoverTrigger asChild>
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
            selected={value}
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
