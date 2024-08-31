"use client";

import { useState } from "react";
import { CheckmarkIcon } from "./icons/icons";
import { Pencil } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function EditableValue({
  initialValue,
  onSubmit,
  emptyDisplay,
  consistentWidth = true,
}: {
  initialValue: string;
  onSubmit: (value: string) => Promise<boolean>;
  emptyDisplay?: string;
  consistentWidth?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [editedValue, setEditedValue] = useState(initialValue);

  if (isOpen) {
    return (
      <div className="my-auto h-full flex items-center gap-2">
        <Input
          value={editedValue}
          onChange={(e) => {
            setEditedValue(e.target.value);
          }}
          onKeyDown={async (e) => {
            if (e.key === "Enter") {
              const success = await onSubmit(editedValue);
              if (success) {
                setIsOpen(false);
              }
            }
            if (e.key === "Escape") {
              setIsOpen(false);
              onSubmit(initialValue);
            }
          }}
          className="w-12 h-6 text-xs px-2"
        />
        <Button
          onClick={async () => {
            const success = await onSubmit(editedValue);
            if (success) {
              setIsOpen(false);
            }
          }}
          variant="ghost"
          size="smallIcon"
        >
          <CheckmarkIcon size={14} className="text-green-700" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span>{initialValue || emptyDisplay}</span>
      <Button onClick={() => setIsOpen(true)} variant="ghost" size="smallIcon">
        <Pencil size={14} />
      </Button>
    </div>
  );
}
