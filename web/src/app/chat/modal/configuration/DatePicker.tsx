"use client";

import * as React from "react";
import { addDays, format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
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

export function DatePicker({
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(2022, 0, 20),
    to: addDays(new Date(2022, 0, 20), 20),
  });
  const [placeholder, setPlaceholder] = React.useState("Select Range");

  const handlePresetClick = (from: Date, to: Date) => {
    setDate({ from, to });
    setPlaceholder(
      to
        ? `${format(from, "LLL dd, y")} - ${format(to, "LLL dd, y")}`
        : format(from, "LLL dd, y")
    );
  };

  const getXDaysAgo = (daysAgo: number) => {
    const today = new Date();
    const daysAgoDate = new Date(today);
    daysAgoDate.setDate(today.getDate() - daysAgo);
    return daysAgoDate;
  };

  const handleSelectChange = (value: string) => {
    const now = new Date();
    let startDate: Date;

    switch (value) {
      case "last_30_days":
        startDate = getXDaysAgo(30);
        break;
      case "last_7_days":
        startDate = getXDaysAgo(7);
        break;
      case "today":
        startDate = getXDaysAgo(1);
        break;
      default:
        return;
    }

    handlePresetClick(startDate, now);
  };

  return (
    <div className="flex gap-0.5">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal !rounded-r-none !border-input",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 !z-[1001]" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      <Select onValueChange={handleSelectChange}>
        <SelectTrigger className="w-[150px] rounded-l-none !rounded-r-regular">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="z-[1001]">
          <SelectItem value="last_30_days">Last 30 Days</SelectItem>
          <SelectItem value="last_7_days">Last 7 Days</SelectItem>
          <SelectItem value="today">Today</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
