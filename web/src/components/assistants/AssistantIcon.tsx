import { Persona } from "@/app/admin/assistants/interfaces";
import React from "react";
import { Tooltip } from "../tooltip/Tooltip";
import { createSVG } from "@/lib/assistantIconUtils";

// Previous itereation of color generation
// export function generatePastelColorFromId(id: string): string {
//   const hash = Array.from(id).reduce(
//     (acc, char) => acc + char.charCodeAt(0),
//     0
//   );
//   const hue = (hash * 137.508) % 360; // Use golden angle approximation
//   const saturation = 70 + (hash % 10); // Saturation between 70-80%
//   const lightness = 85 + (hash % 10); // Lightness between 85-95%
//   return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
// }

export function darkerGenerateColorFromId(id: string): string {
  if (id == "0") {
    return "#262626";
  }
  const hash = Array.from(id).reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0
  );
  const hue = (hash * 137.508) % 360; // Use golden angle approximation
  // const saturation = 40 + (hash % 10); // Saturation between 40-50%
  // const lightness = 40 + (hash % 10); // Lightness between 40-50%
  const saturation = 35 + (hash % 10); // Saturation between 40-50%
  const lightness = 35 + (hash % 10); // Lightness between 40-50%

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function AssistantIcon({
  assistant,
  size,
  border,
}: {
  assistant: Persona;
  size?: "small" | "medium" | "large";
  border?: boolean;
}) {
  const color = darkerGenerateColorFromId(assistant.id.toString());

  return (
    <Tooltip delayDuration={1000} content={assistant.description}>
      {assistant.icon_shape && assistant.icon_color ? (
        <div
          className={`flex-none 
            ${border && "ring ring-[1px] ring-border-strong "}
            ${size === "large" ? "w-8 h-8" : "w-6 h-6"} `}
        >
          {createSVG(
            { encodedGrid: assistant.icon_shape, filledSquares: 0 },
            assistant.icon_color,
            size == "large" ? 48 : 36
          )}
        </div>
      ) : (
        <div
          className={`flex-none rounded-lg overflow-hidden
              ${border && "border border-.5 border-border-strong "}
              ${size === "large" && "w-12 h-12"}
              ${(!size || size === "small") && "w-6 h-6"} `}
          style={{ backgroundColor: color }}
        />
      )}
    </Tooltip>
  );
}
