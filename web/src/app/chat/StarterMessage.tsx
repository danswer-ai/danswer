import { StarterMessage as StarterMessageType } from "../admin/assistants/interfaces";
import { NewChatIcon } from "@/components/icons/icons";

export function StarterMessage({
  starterMessage,
  onClick,
}: {
  starterMessage: StarterMessageType;
  onClick: () => void;
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-lg border border-border bg-gradient-to-br from-white to-gray-50 p-4 shadow-sm mobile:transition-none mobile:duration-0 transition-all duration-300 mobile:hover:shadow-none mobile:hover:scale-100 hover:shadow-md hover:scale-[1.02] cursor-pointer"
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-purple-100 opacity-0 mobile:group-hover:opacity-0 group-hover:opacity-20 mobile:transition-none transition-opacity duration-300"></div>
      <h3 className="text-lg font-medium	text-text-800 mobile:group-hover:text-text-800 group-hover:text-text-900 mobile:transition-none transition-colors duration-300">
        {starterMessage.name}
      </h3>
      <div className="mobile:max-h-full mobile:group-hover:max-h-full max-h-0 group-hover:max-h-[200px] overflow-hidden mobile:transition-none transition-all duration-500 ease-in-out group-hover:transition-[max-height] group-hover:duration-500 transition-[max-height] duration-200">
        <p className="text-sm text-text-600">{starterMessage.description}</p>
      </div>
      <div className="absolute bottom-0 right-0 p-2 mobile:opacity-100 opacity-0 group-hover:opacity-100 mobile:transition-none transition-opacity duration-300">
        <NewChatIcon className="text-blue-500" />
      </div>
    </div>
  );
}
