import * as React from "react";
import { ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface ComboboxProps {
  items: { value: string; label: string }[];
  onSelect?: (selectedValue: string[]) => void;
  placeholder?: string;
  label?: string;
}

export function Combobox({
  items,
  onSelect,
  placeholder = "Select an item...",
  label = "Select item",
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedItems, setSelectedItems] = React.useState<
    { value: string; label: string }[]
  >([]);

  const handleSelect = (currentValue: string) => {
    const selectedItem = items.find((item) => item.label === currentValue);
    if (
      selectedItem &&
      !selectedItems.some((item) => item.value === selectedItem.value)
    ) {
      const newSelectedItems = [...selectedItems, selectedItem];
      setSelectedItems(newSelectedItems);
      if (onSelect) {
        onSelect(newSelectedItems.map((item) => item.value));
      }
    }
    setOpen(false);
  };

  const handleRemove = (value: string) => {
    const updatedSelectedItems = selectedItems.filter(
      (item) => item.value !== value
    );
    setSelectedItems(updatedSelectedItems);
    if (onSelect) {
      onSelect(updatedSelectedItems.map((item) => item.value));
    }
  };

  const filteredItems = items.filter(
    (item) => !selectedItems.some((selected) => selected.value === item.value)
  );

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between text-subtle border border-input"
          >
            {selectedItems.length > 0
              ? `${selectedItems.length} selected`
              : label}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="min-w-[300px] sm:min-w-[495px] md:min-w-[550px] lg:min-w-[495px] xl:min-w-[625px]"
          align="start"
        >
          <Command>
            <CommandInput
              placeholder={`Search ${placeholder.toLowerCase()}...`}
            />
            <CommandList>
              <CommandEmpty>No items found.</CommandEmpty>
              <CommandGroup>
                {filteredItems.map((item) => (
                  <CommandItem
                    key={item.value}
                    value={item.label}
                    onSelect={() => handleSelect(item.label)}
                  >
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected items badges */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {selectedItems.map((selectedItem) => (
            <Badge
              key={selectedItem.value}
              onClick={() => handleRemove(selectedItem.value)}
              variant="outline"
              className="cursor-pointer hover:bg-opacity-80"
            >
              {selectedItem.label}
              <X className="ml-1 my-auto cursor-pointer" size={14} />
            </Badge>
          ))}
        </div>
      )}
    </>
  );
}
