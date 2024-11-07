import { FiImage, FiSearch } from "react-icons/fi";
import { Assistant } from "../admin/assistants/interfaces";
import { Badge } from "@/components/ui/badge";

export function AssistantTools({
  assistant,
  list,
  hovered,
}: {
  assistant: Assistant;
  list?: boolean;
  hovered?: boolean;
}) {
  return (
    <div className="relative text-xs overflow-x-hidden flex text-subtle">
      <span
        className={`${assistant.tools.length > 0 && "py-1"}  ${!list ? "font-semibold" : "text-subtle text-sm"}`}
      >
        Tools:
      </span>{" "}
      {assistant.tools.length == 0 ? (
        <p className="ml-1">None</p>
      ) : (
        <div className="ml-1 flex flex-wrap gap-1">
          {assistant.tools.map((tool, ind) => {
            if (tool.name === "SearchTool") {
              return (
                <Badge key={ind} variant="outline">
                  <FiSearch key={ind} />
                  Search
                </Badge>
              );
            } else if (tool.name === "ImageGenerationTool") {
              return (
                <Badge key={ind} variant="outline">
                  <FiImage key={ind} />
                  Image Generation
                </Badge>
              );
            } else {
              return (
                <Badge key={ind} variant="outline">
                  <div className="flex gap-x-1">{tool.name}</div>
                </Badge>
              );
            }
          })}
        </div>
      )}
    </div>
  );
}
