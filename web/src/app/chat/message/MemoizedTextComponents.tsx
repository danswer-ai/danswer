import { Citation } from "@/components/search/results/Citation";
import React, { memo } from "react";
import { IMAGE_GENERATION_TOOL_NAME } from "../tools/constants";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SearchIcon } from "lucide-react";
import DualPromptDisplay from "../tools/ImageCitation";
import { PopupSpec, usePopup } from "@/components/admin/connectors/Popup";
import { ImageGenerationResults, ToolCallFinalResult } from "../interfaces";

export const MemoizedLink = memo(
  ({
    toolCall,
    setPopup,
    ...props
  }: {
    toolCall?: ToolCallFinalResult;
    setPopup: (popupSpec: PopupSpec | null) => void;
  } & any) => {
    const { node, ...rest } = props;
    const value = rest.children;

    if (value?.toString().startsWith(IMAGE_GENERATION_TOOL_NAME)) {
      const imageGenerationResult =
        toolCall?.tool_result as ImageGenerationResults;

      return (
        <Popover>
          <PopoverTrigger asChild>
            <span className="inline-block">
              <SearchIcon className="cursor-pointer flex-none text-blue-500 hover:text-blue-700 !h-4 !w-4 inline-block" />
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-96" side="top" align="center">
            <DualPromptDisplay
              arg="Prompt"
              setPopup={setPopup!}
              prompts={imageGenerationResult.map(
                (result) => result.revised_prompt
              )}
            />
          </PopoverContent>
        </Popover>
      );
    }

    if (value?.toString().startsWith("*")) {
      return (
        <div className="flex-none bg-background-800 inline-block rounded-full h-3 w-3 ml-2" />
      );
    } else if (value?.toString().startsWith("[")) {
      return <Citation link={rest?.href}>{rest.children}</Citation>;
    } else {
      return (
        <a
          onMouseDown={() =>
            rest.href ? window.open(rest.href, "_blank") : undefined
          }
          className="cursor-pointer text-link hover:text-link-hover"
        >
          {rest.children}
        </a>
      );
    }
  }
);

export const MemoizedParagraph = memo(({ ...props }: any) => {
  return <p {...props} className="text-default" />;
});

MemoizedLink.displayName = "MemoizedLink";
MemoizedParagraph.displayName = "MemoizedParagraph";
