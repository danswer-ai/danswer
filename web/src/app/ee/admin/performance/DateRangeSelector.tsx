import { CustomDatePicker } from "@/components/CustomDatePicker";
import { DateRange } from "react-day-picker";

const predefinedRanges = [
  { value: "30d", label: "Last 30 days" },
  { value: "7d", label: "Last 7 days" },
  { value: "today", label: "Today" },
];

export function DateRangeSelector({
  value,
  onValueChange,
}: {
  value: DateRange;
  onValueChange: (value: DateRange) => void;
}) {
  return (
    <CustomDatePicker
      value={value}
      onValueChange={onValueChange}
      predefinedRanges={predefinedRanges}
    />
  );
}
