import { Assistant } from "@/app/admin/assistants/interfaces";
import React from "react";
import { createSVG } from "@/lib/assistantIconUtils";
import { buildImgUrl } from "@/app/chat/files/images/utils";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

export function darkerGenerateColorFromId(id: string): string {
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
  assistant: Assistant;
  size?: "small" | "medium" | "large";
  border?: boolean;
}) {
  const color = darkerGenerateColorFromId(assistant.id.toString());

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          {
            // Prioritization order: image, graph, defaults
            assistant.uploaded_image_id ? (
              <Image
                alt={`${assistant.name} logo`}
                className={`object-cover object-center rounded-sm overflow-hidden transition-opacity duration-300 opacity-100 my-auto
              ${size === "large" ? "w-8 h-8" : "w-6 h-6"}`}
                src={buildImgUrl(assistant.uploaded_image_id)}
                loading="lazy"
              />
            ) : assistant.icon_shape && assistant.icon_color ? (
              <div
                className={`flex-none my-auto mb-0
                  ${border && "ring-[1px] ring-border-strong "}
                  ${size === "large" ? "w-10 h-10" : "w-6 h-6"} `}
              >
                {createSVG(
                  { encodedGrid: assistant.icon_shape, filledSquares: 0 },
                  assistant.icon_color,
                  size == "large" ? 32 : 24
                )}
              </div>
            ) : (
              <div
                className={`flex-none rounded-sm overflow-hidden my-auto
                  ${border && "border border-.5 border-border-strong "}
                  ${size === "large" && "w-12 h-12"}
                  ${(!size || size === "small") && "w-6 h-6"} `}
                style={{ backgroundColor: color }}
              />
            )
          }
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center">
          <p className="break-normal whitespace-normal">
            {assistant.description}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
