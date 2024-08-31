import { Assistant } from "@/app/admin/assistants/interfaces";
import React from "react";
import logo from "../../../public/logo.png";
import Image from "next/image";

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
  assistant: Assistant;
  size?: "small" | "medium" | "large";
  border?: boolean;
}) {
  const color = generatePastelColorFromId(assistant.id.toString());

  return (
    <Image
      src={logo}
      alt="enmedd-logo"
      className={`
    ${border && " border border-.5 border-border-strong "}
    ${(!size || size == "large") && "w-10 h-10"}
    ${size == "small" && "w-7 h-7"}
    rounded-regular
    `}
    />
  );
}
