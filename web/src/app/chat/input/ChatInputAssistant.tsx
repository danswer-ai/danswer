"use client";

import { Assistant } from "@/app/admin/assistants/interfaces";
import { AssistantIcon } from "@/components/assistants/AssistantIcon";
import { CustomTooltip } from "@/components/CustomTooltip";
import { ForwardedRef, forwardRef, useState } from "react";
import { FiX } from "react-icons/fi";

interface DocumentSidebarProps {
  alternativeAssistant: Assistant;
  unToggle: () => void;
}

export const ChatInputAssistant = forwardRef<
  HTMLDivElement,
  DocumentSidebarProps
>(({ alternativeAssistant, unToggle }, ref: ForwardedRef<HTMLDivElement>) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="flex-none h-10 duration-300 items-center rounded-lg bg-background-150"
    >
      <CustomTooltip
        trigger={
          <div
            ref={ref}
            className="p-2 gap-x-1 relative rounded-t-lg items-center flex"
          >
            <AssistantIcon assistant={alternativeAssistant} border />
            <p className="ml-1 line-clamp-1 ellipsis break-all my-auto">
              {alternativeAssistant.name}
            </p>
            <div className="rounded-lg h-fit cursor-pointer" onClick={unToggle}>
              <FiX />
            </div>
          </div>
        }
      >
        <p className="max-w-xs flex">{alternativeAssistant.description}</p>
      </CustomTooltip>
    </div>
  );
});

ChatInputAssistant.displayName = "TempAssistant";
export default ChatInputAssistant;
