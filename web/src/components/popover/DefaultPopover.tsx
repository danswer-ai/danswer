/* "use client";

import { useState } from "react";
import { Popover } from "./Popover";

export function DefaultPopover(props: {
  content: JSX.Element;
  children: JSX.Element[];
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  alignOffset?: number;
  matchWidth?: boolean;
  requiresContentPadding?: boolean;
  triggerMaxWidth?: boolean;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <Popover
      open={popoverOpen}
      onOpenChange={setPopoverOpen}
      popover={
        <div
          className={`
          text-strong 
          text-sm
          border 
          border-border 
          bg-background
          rounded-regular
          shadow-lg 
          flex 
          flex-col 
          w-full 
          max-h-96 
          overflow-y-auto 
          p-1
          overscroll-contain
        `}
        >
          {props.children.map((child, index) => (
            <div
              key={index}
              className="cursor-pointer text-left text-sm p-2 hover:bg-hover-light"
              onClick={() => setPopoverOpen(false)}
            >
              {child}
            </div>
          ))}
        </div>
      }
      {...props}
      content={
        <div onClick={() => setPopoverOpen(!popoverOpen)}>{props.content}</div>
      }
    />
  );
} */
"use client";

import { useState } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

export function DefaultPopover(props: {
  content: JSX.Element;
  children: JSX.Element[];
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  alignOffset?: number;
  matchWidth?: boolean;
  requiresContentPadding?: boolean;
  triggerMaxWidth?: boolean;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <div onClick={() => setPopoverOpen(!popoverOpen)}>{props.content}</div>
      </PopoverTrigger>
      <PopoverContent
        side={props.side}
        align={props.align}
        sideOffset={props.sideOffset}
        alignOffset={props.alignOffset}
      >
        {props.children.map((child, index) => (
          <div key={index} onClick={() => setPopoverOpen(false)}>
            {child}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
