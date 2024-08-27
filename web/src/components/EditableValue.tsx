/* "use client";

import { useState } from "react";
import { CheckmarkIcon } from "./icons/icons";
import { Pencil } from "lucide-react";

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
      <div className="my-auto h-full flex">
        <input
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
          className="border bg-background-strong border-gray-300 rounded py-1 px-1 w-12 h-4 my-auto"
        />
        <div
          onClick={async () => {
            const success = await onSubmit(editedValue);
            if (success) {
              setIsOpen(false);
            }
          }}
          className="cursor-pointer my-auto ml-2"
        >
          <CheckmarkIcon size={16} className="text-green-700" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div
        className="flex my-auto cursor-pointer hover:bg-hover rounded"
        onClick={() => setIsOpen(true)}
      >
        <div className={"flex " + (consistentWidth && " w-6")}>
          <div className="ml-auto my-auto">{initialValue || emptyDisplay}</div>
        </div>
        <div className="cursor-pointer ml-2 my-auto h-4">
          <Pencil size={16} />
        </div>
      </div>
    </div>
  );
} */

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
          className="w-12 h-8"
        />
        <Button
          onClick={async () => {
            const success = await onSubmit(editedValue);
            if (success) {
              setIsOpen(false);
            }
          }}
          variant="ghost"
          size="xs"
          className="!p-1.5 !px-[7px]"
        >
          <CheckmarkIcon size={16} className="text-green-700" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span>{initialValue || emptyDisplay}</span>
      <Button
        onClick={() => setIsOpen(true)}
        variant="ghost"
        size="xs"
        className="!p-1.5 !px-[7px]"
      >
        <Pencil size={14} />
      </Button>
    </div>
  );
}
