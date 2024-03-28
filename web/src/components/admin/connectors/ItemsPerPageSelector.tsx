import React from 'react';
import { CustomDropdown, DefaultDropdownElement } from "@/components/Dropdown";

const options = [
  { label: "10 items", value: 10 },
  { label: "25 items", value: 25 },
  { label: "50 items", value: 50 },
  { label: "100 items", value: 100 },
];

export function ItemsPerPageSelector({
  itemsPerPage,
  onItemsPerPageChange,
  className
}: {
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
  className?: string;
}) {
  return (
    <CustomDropdown
      dropdown={
        <div
          className={`
            border 
            border-border 
            bg-background
            rounded-lg 
            flex 
            flex-col 
            w-48 
            max-h-96 
            overflow-y-auto 
            flex
            overscroll-contain`}
        >
          {options.map((option) => (
            <DefaultDropdownElement
              key={option.value}
              name={option.label}
              onSelect={() => onItemsPerPageChange(option.value)}
              isSelected={itemsPerPage === option.value}
            />
          ))}
        </div>
      }
    >
      <div
        className={`
            flex 
            text-sm  
            px-3
            py-1.5 
            rounded-lg 
            border 
            border-border 
            cursor-pointer 
            hover:bg-hover`}
      >
        {`${itemsPerPage} items per page`}
      </div>
    </CustomDropdown>
  );
}
