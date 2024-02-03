import { StarterMessage } from "../admin/assistants/interfaces";

export function StarterMessage({
  starterMessage,
  onClick,
}: {
  starterMessage: StarterMessage;
  onClick: () => void;
}) {
  return (
    <div
      className={
        "py-2 px-3 rounded border border-border bg-white dark:bg-background-emphasis-dark cursor-pointer hover:bg-hover-light h-full dark:border-neutral-900 dark:hover:bg-hover-neutral-800"
      }
      onClick={onClick}
    >
      <p className="font-medium text-neutral-700">{starterMessage.name}</p>
      <p className="text-neutral-500 text-sm">{starterMessage.description}</p>
    </div>
  );
}
