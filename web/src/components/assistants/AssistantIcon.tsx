import { Persona } from "@/app/admin/assistants/interfaces";
import React from "react";
import { Tooltip } from "../tooltip/Tooltip";
import { createSVG } from "@/lib/assistantIconUtils";

export function AssistantIcon({
  assistant,
  size,
  border,
  encodedGrid,
}: {
  assistant: Persona;
  size?: "small" | "medium" | "large";
  border?: boolean;
  encodedGrid: number;
}) {
  return (
    <Tooltip delayDuration={1000} content={assistant.description}>
      <div
        className={`flex-none
        ${border && "border border-.5 border-border-strong"}
        ${(!size || size === "large") && "w-12 h-12"}
        ${size === "small" && "w-6 h-6"}
        rounded-lg overflow-hidden
        `}
      >
        {createSVG({ encodedGrid, filledSquares: 0 })}
      </div>
    </Tooltip>
  );
}
