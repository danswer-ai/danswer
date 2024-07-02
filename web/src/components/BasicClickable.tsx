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
        border-border 
        shadow-md
        rounded
        font-medium 
        text-emphasis 
        text-sm
        p-1
        h-full
        bg-background
        select-none
        hover:bg-hover-light
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
        border-border 
        shadow-md
        rounded
        font-medium 
        text-emphasis
        text-sm
        p-1
        select-none
        bg-hover-light
        hover:bg-hover
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
  padding = "normal",
}: {
  children: string | JSX.Element;
  selected: boolean;
  hasBorder?: boolean;
  fullWidth?: boolean;
  padding?: "none" | "normal" | "extra";
}) {
  return (
    <div
      className={`
        rounded
        font-medium 
        text-emphasis 
        text-sm
        ${padding == "normal" && "p-1"}
        ${padding == "extra" && "p-1.5"}
        select-none
        ${hasBorder ? "border border-border" : ""}
        ${selected ? "bg-hover" : "hover:bg-hover"}
        ${fullWidth ? "w-full" : ""}`}
    >
      {children}
    </div>
  );
}
