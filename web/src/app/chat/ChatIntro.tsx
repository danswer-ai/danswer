import { Persona } from "../admin/assistants/interfaces";
import { AssistantIcon } from "@/components/assistants/AssistantIcon";
import { useState } from "react";
import { DisplayAssistantCard } from "@/components/assistants/AssistantCards";

export function ChatIntro({ selectedPersona }: { selectedPersona: Persona }) {
  const [hoveredAssistant, setHoveredAssistant] = useState(false);

  return (
    <>
      <div className="mobile:w-[90%] mobile:px-4 w-message-xs 2xl:w-message-sm 3xl:w-message">
        <div className="relative flex w-fit mx-auto justify-center">
          <div className="absolute z-10 -left-20 top-1/2 -translate-y-1/2">
            <div className="relative">
              <div
                onMouseEnter={() => setHoveredAssistant(true)}
                onMouseLeave={() => setHoveredAssistant(false)}
                className="p-4 scale-[.8] cursor-pointer border-dashed rounded-full flex border border-border border-2 border-dashed"
                style={{
                  borderStyle: "dashed",
                  borderWidth: "1.5px",
                  borderSpacing: "4px",
                }}
              >
                <AssistantIcon
                  disableToolip
                  size={"large"}
                  assistant={selectedPersona}
                />
              </div>
              <div className="absolute right-full mr-2 w-[300px] top-0">
                {hoveredAssistant && (
                  <DisplayAssistantCard selectedPersona={selectedPersona} />
                )}
              </div>
            </div>
          </div>

          <div className="text-3xl line-clamp-2 text-text-800 font-base font-semibold text-strong">
            {selectedPersona?.name || "How can I help you today?"}
          </div>
        </div>
      </div>
    </>
  );
}
