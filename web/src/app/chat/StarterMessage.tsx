import { StarterMessage as StarterMessageType } from "../admin/assistants/interfaces";
import { NewChatIcon, SendIcon } from "@/components/icons/icons";
import { useState } from "react";

export function StarterMessage({
  starterMessage,
  onClick,
}: {
  starterMessage: StarterMessageType;
  onClick: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="mx-2 group relative overflow-hidden rounded-lg border border-border bg-gradient-to-br from-white to-background p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.01] cursor-pointer"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-purple-100 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
      <h3
        className="text-lg font-medium text-text-800 group-hover:text-text-900 transition-colors duration-300
                     line-clamp-2 overflow-hidden"
      >
        {starterMessage.name}
      </h3>
      <div
        className={`overflow-hidden transition-all duration-300 ${isHovered ? "max-h-20" : "max-h-0"}`}
      >
        <p className="text-sm text-text-600 mt-2">
          {starterMessage.description}
        </p>
      </div>
      <div className="absolute bottom-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <SendIcon className="text-blue-500" />
      </div>
    </div>
  );
}
