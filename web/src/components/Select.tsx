import { ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CustomSelectProps<T> {
  items: T[];
  selectedItem: T | null;
  onItemSelect: (item: T) => void;
  getItemValue: (item: T) => string;
  getItemLabel: (item: T) => ReactNode;
  placeholder?: string;
  renderTriggerContent?: (selectedItem: T | null) => ReactNode;
  width?: string;
}

export function CustomSelect<T>({
  items,
  selectedItem,
  onItemSelect,
  getItemValue,
  getItemLabel,
  placeholder,
  renderTriggerContent,
  width = "100%",
}: CustomSelectProps<T>) {
  return (
    <Select
      value={selectedItem ? getItemValue(selectedItem) : ""}
      onValueChange={(value) => {
        const selectedItem = items.find((item) => getItemValue(item) === value);
        if (selectedItem) {
          onItemSelect(selectedItem);
        }
      }}
    >
      <SelectTrigger style={{ width: `${width}` }}>
        {renderTriggerContent ? (
          renderTriggerContent(selectedItem)
        ) : (
          <SelectValue placeholder={placeholder || "Select an option"} />
        )}
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={getItemValue(item)} value={getItemValue(item)}>
            {getItemLabel(item)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
