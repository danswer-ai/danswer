"use client";

import { Persona } from "@/app/admin/assistants/interfaces";
import { AssistantIcon } from "@/components/assistants/AssistantIcon";
import { Hoverable } from "@/components/Hoverable";
import { Tooltip } from "@/components/tooltip/Tooltip";
import { ForwardedRef, forwardRef, useState } from "react";
import { FiInfo, FiX } from "react-icons/fi";

interface DocumentSidebarProps {
  alternativeAssistant: Persona;
  unToggle: () => void;
}

export const TempAssistant = forwardRef<HTMLDivElement, DocumentSidebarProps>(
  ({ alternativeAssistant, unToggle }, ref: ForwardedRef<HTMLDivElement>) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex-none h-10 duration-300 h-10  items-center  rounded-lg bg-background-weakish"
      >
        <Tooltip
          content={
            <p className="max-w-xs  flex ">
              {alternativeAssistant.description}
            </p>
          }
        >
          <div
            ref={ref}
            className="p-2 relative rounded-t-lg items-center flex"
          >
            <AssistantIcon assistant={alternativeAssistant} border />
            <p className="ml-1 line-clamp-1 ellipsis  break-all my-auto">
              {alternativeAssistant.name}
            </p>
            <div className="flex gap-x-1 ml-auto ">{/* </Tooltip> */}</div>
          </div>
        </Tooltip>
        {isHovered && (
          <div
            className="bg-neutral- rounded-lg p-.5 rounded h-fit cursor-pointer"
            onClick={unToggle}
          >
            <FiX />
          </div>
        )}
      </div>
    );
  }
);

export const TempAssistant2 = forwardRef<HTMLDivElement, DocumentSidebarProps>(
  ({ alternativeAssistant, unToggle }, ref: ForwardedRef<HTMLDivElement>) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex"
      >
        <Tooltip
          content={
            <p className="max-w-xs  flex ">
              {alternativeAssistant.description}
            </p>
          }
        >
          <div className="ltext-neutral-700 flex flex-wrap gap-y-1 gap-x-2 px-2 max-w-[200px]">
            <div
              ref={ref}
              className="p-2 relative  rounded-t-lg items-center flex"
            >
              <AssistantIcon assistant={alternativeAssistant} border />
              <p className="ml-3 line-clamp-1 ellipsis  break-all my-auto">
                {alternativeAssistant.name}
              </p>
              <div className="flex gap-x-1 ml-auto ">{/* </Tooltip> */}</div>
            </div>
          </div>
        </Tooltip>
        {isHovered && (
          // <div className=" flex gap-x-1 p-1 bg-neutral-50 rounded-bl-lg">
          <div
            className="bg-neutral- rounded-lg p-.5 rounded h-fit cursor-pointer"
            onClick={unToggle}
          >
            <FiX />
          </div>
          // {/* </div> */}
        )}
      </div>
    );
  }
);

TempAssistant.displayName = "TempAssistant";
TempAssistant2.displayName = "TempAssistant2";
