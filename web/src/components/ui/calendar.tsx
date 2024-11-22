"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-calendar-text-muted rounded-md w-9 font-normal text-[0.8rem] dark:text-calendar-text-muted-dark",
        row: "flex w-full mt-2",
        cell: cn(
          "h-9 w-9 text-center text-sm p-0 relative",
          "[&:has([aria-selected].day-range-end)]:rounded-r-md",
          "[&:has([aria-selected].day-outside)]:bg-calendar-bg-outside-selected",
          "[&:has([aria-selected])]:bg-calendar-bg-selected",
          "first:[&:has([aria-selected])]:rounded-l-md",
          "last:[&:has([aria-selected])]:rounded-r-md",
          "focus-within:relative focus-within:z-20",
          "dark:[&:has([aria-selected].day-outside)]:bg-calendar-bg-outside-selected-dark",
          "dark:[&:has([aria-selected])]:bg-calendar-bg-selected-dark"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_selected: cn(
          "bg-calendar-selected text-calendar-text-selected rounded-full",
          "hover:bg-calendar-selected hover:text-calendar-text-selected",
          "focus:bg-calendar-selected focus:text-calendar-text-selected"
        ),
        day_range_start: cn(
          "bg-calendar-range-start text-calendar-text-end rounded-l-full",
          "hover:bg-calendar-range-start hover:text-calendar-text-end",
          "focus:bg-calendar-range-start focus:text-calendar-text-end"
        ),
        day_range_end: cn(
          "bg-calendar-range-end text-calendar-text-selected rounded-r-full",
          "hover:bg-calendar-range-end hover:text-calendar-text-selected",
          "focus:bg-calendar-range-end focus:text-calendar-text-selected"
        ),
        day_today:
          "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50",
        day_outside:
          "day-outside text-neutral-500 opacity-50 aria-selected:bg-neutral-100/50 aria-selected:text-neutral-500 aria-selected:opacity-30 dark:text-neutral-400 dark:aria-selected:bg-neutral-800/50 dark:aria-selected:text-neutral-400",
        day_disabled: "text-neutral-500 opacity-50 dark:text-neutral-400",
        day_range_middle:
          "aria-selected:bg-calendar-bg-selected aria-selected:text-calendar-text-selected dark:aria-selected:bg-calendar-bg-selected-dark dark:aria-selected:text-calendar-text-selected-dark",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
