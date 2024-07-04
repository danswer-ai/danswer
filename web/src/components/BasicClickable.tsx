export function BasicClickable({
  children,
  onClick,
  fullWidth = false,
  inset,
}: {
  children: string | JSX.Element;
  onClick?: () => void;
  inset?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        border 
        border-border
        rounded
        font-medium 
        text-emphasis 
        text-sm
        relative
        px-1 py-1.5
        h-full
        bg-background
        select-none
        overflow-hidden
        hover:bg-hover-light
        ${fullWidth ? "w-full" : ""}`}
    >
      {inset && (
        <div className=" rounded absolute inset-0 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3),inset_0_-2px_2px_rgba(255,255,255,0.5)]" />
      )}

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
