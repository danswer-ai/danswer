import { Bubble } from "@/components/Bubble";
import { ToolSnapshot } from "@/lib/tools/interfaces";
import { FiImage, FiSearch, FiGlobe, FiMoreHorizontal } from "react-icons/fi";
import { Persona } from "../admin/assistants/interfaces";
import { CustomTooltip } from "@/components/tooltip/CustomTooltip";

export function ToolsDisplay({ tools }: { tools: ToolSnapshot[] }) {
  return (
    <div className="text-xs text-subtle flex flex-wrap gap-1 mt-2">
      <p className="text-sm text-default my-auto">Tools:</p>
      {tools.map((tool) => {
        let toolName = tool.name;
        let toolIcon = null;

        if (tool.name === "SearchTool") {
          toolName = "Search";
          toolIcon = <FiSearch className="mr-1 my-auto" />;
        } else if (tool.name === "ImageGenerationTool") {
          toolName = "Image Generation";
          toolIcon = <FiImage className="mr-1 my-auto" />;
        } else if (tool.name === "InternetSearchTool") {
          toolName = "Internet Search";
          toolIcon = <FiGlobe className="mr-1 my-auto" />;
        }

        return (
          <Bubble key={tool.id} isSelected={false} notSelectable>
            <div className="flex flex-row gap-0.5">
              {toolIcon}
              {toolName}
            </div>
          </Bubble>
        );
      })}
    </div>
  );
}

export function AssistantTools({
  assistant,
  list,
}: {
  assistant: Persona;
  list?: boolean;
}) {
  const nonDefaultTools = assistant.tools.filter(
    (tool) => tool.name !== "SearchTool" && tool.name !== "ImageGenerationTool"
  );
  return (
    <div className="relative text-xs flex items-center text-subtle">
      <span className={`${!list ? "font-medium" : "text-subtle text-sm"}`}>
        Powers:
      </span>{" "}
      {assistant.tools.length == 0 ? (
        <p className="ml-1">None</p>
      ) : (
        <>
          {assistant.tools.map((tool, ind) => {
            if (tool.name === "SearchTool") {
              return <FiSearch key={ind} className="ml-1 h-3 w-3 my-auto" />;
            } else if (tool.name === "ImageGenerationTool") {
              return <FiImage key={ind} className="ml-1 h-3 w-3 my-auto" />;
            }
          })}

          {!(nonDefaultTools.length == 0) && (
            <div className="my-auto flex items-center">
              <CustomTooltip
                position="top"
                content={
                  <div className="text-xs max-w-2xl w-full text-200">
                    <p>Additional Tools:</p>
                    <div className="flex flex-col mt-1 gap-y-2">
                      {nonDefaultTools.map((tool, ind) => (
                        <p key={ind}>
                          {tool.display_name}:
                          <span className="ml-2">{tool.description}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                }
              >
                <FiMoreHorizontal className="cursor-pointer ml-1 h-3 w-3 my-auto" />
              </CustomTooltip>
            </div>
          )}
        </>
      )}
    </div>
  );
}
