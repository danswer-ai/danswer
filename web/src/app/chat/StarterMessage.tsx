import { StarterMessage as StarterMessageType } from "../admin/assistants/interfaces";

export function StarterMessage({
  starterMessage,
  onClick,
}: {
  starterMessage: StarterMessageType;
  onClick: () => void;
}) {
  return (
    <div
      className="mb-4 mx-2 group relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-white to-background p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.005] cursor-pointer"
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-purple-100 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
      <h3
        className="text-base flex items-center font-medium text-text-800 group-hover:text-text-900 transition-colors duration-300
                     line-clamp-2  gap-x-2 overflow-hidden"
      >
        {starterMessage.name}
      </h3>
      <div className={`overflow-hidden transition-all duration-300 max-h-20}`}>
        <p className="text-sm text-text-600 mt-2">
          {starterMessage.description}
        </p>
      </div>
    </div>
  );
}
