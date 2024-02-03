export function BasicClickable({
  children,
  onClick,
  fullWidth = false,
}: {
  children: string | JSX.Element;
  onClick?: () => void;
  fullWidth?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        border 
        border-border dark:border-neutral-900 
        shadow-md
        rounded
        font-medium 
        text-emphasis dark:text-gray-400 
        text-sm
        p-1
        select-none
        hover:bg-hover dark:hover:bg-neutral-800
        ${fullWidth ? "w-full" : ""}`}
    >
      {children}
    </button>
  );
}

export function EmphasizedClickable({
  children,
  onClick,
  fullWidth = false,
}: {
  children: string | JSX.Element;
  onClick?: () => void;
  fullWidth?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        border 
        border-border dark:border-neutral-900 
        shadow-md
        rounded
        font-medium 
        text-emphasis dark:text-gray-400
        text-sm
        p-1
        select-none
        bg-hover-light dark:bg-neutral-600 
        hover:bg-hover dark:hover:bg-neutral-800
        ${fullWidth ? "w-full" : ""}`}
    >
      {children}
    </button>
  );
}

export function BasicSelectable({
  children,
  selected,
  hasBorder,
  fullWidth = false,
}: {
  children: string | JSX.Element;
  selected: boolean;
  hasBorder?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <button
      className={`
        rounded
        font-medium 
        text-emphasis dark:text-gray-400 
        text-sm
        p-1
        select-none
        ${hasBorder ? "border border-border dark:border-neutral-900" : ""}
        ${selected ? "bg-hover dark:bg-hover-dark" : "hover:bg-hover dark:hover:bg-neutral-800"}
        ${fullWidth ? "w-full" : ""}`}
    >
      {children}
    </button>
  );
}
