import { Persona } from "@/app/admin/assistants/interfaces";
import React from "react";

export function generatePastelColorFromId(id: string): string {
  const hash = Array.from(id).reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0
  );
  const hue = (hash * 137.508) % 360; // Use golden angle approximation
  const saturation = 70 + (hash % 10); // Saturation between 70-80%
  const lightness = 85 + (hash % 10); // Lightness between 85-95%
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
  const color = generatePastelColorFromId(assistant.id.toString());

  return (
    <div
      className={`
      ${border && " border border-.5 border-border-strong "}
      ${(!size || size == "large") && "w-6 h-6"}
      ${size == "small" && "w-6 h-6"}
      rounded-lg
      `}
      style={{ backgroundColor: color }}
    />
  );
}
