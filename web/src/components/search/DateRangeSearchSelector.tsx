import { getXDaysAgo } from "@/lib/dateUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRange as BaseDateRange } from "react-day-picker";

interface CustomDateRange extends BaseDateRange {
  selectValue?: string;
}

export function DateRangeSearchSelector({
  value,
  onValueChange,
  fullWidth,
}: {
  value: CustomDateRange | null;
  onValueChange: (value: CustomDateRange | null) => void;
  fullWidth?: boolean;
}) {
  const formatSelectItem = (key: string, label: string, fromDate: Date) => (
    <SelectItem
      key={key}
      value={label}
      className="flex items-center"
      onClick={() =>
        onValueChange({ from: fromDate, to: new Date(), selectValue: key })
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
            from: dateMappings[selectedValue],
            to: new Date(),
            selectValue: selectedValue,
          });
        } else {
          onValueChange(null);
        }
      }}
      defaultValue=""
    >
      <SelectTrigger className={fullWidth ? "w-full lg:w-64" : "w-40"}>
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
