import { getXDaysAgo } from "@/lib/dateUtils";
import { DateRangePickerValue } from "@tremor/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "../ui/button";

type DateRangeSelectorProps = {
  value: DateRangePickerValue | null;
  onValueChange: (value: DateRangePickerValue | null) => void;
  isMobile?: boolean;
};

export function DateRangeSelector({
  value,
  onValueChange,
  isMobile,
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
    <>
      {isMobile && (
        <div className="w-full p-2.5">
          <span className="flex p-2 text-sm font-bold">Sort by</span>
          <div className="flex gap-2 flex-wrap">
            <Button>Last Accessed</Button>
            <Button variant="secondary">Tags/Labels</Button>
            <Button variant="secondary">Relevance</Button>
          </div>
        </div>
      )}
      <div className="hidden lg:block">
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
      </div>
    </>
  );
}
