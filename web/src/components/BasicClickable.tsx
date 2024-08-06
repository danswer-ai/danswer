/* import { Button } from "@/components/ui/button"; */

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
    <div
      onClick={onClick}
      className="h-full w-full shadow-sm rounded-regular p-3 bg-background"
    >
      {children}
    </div>
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
        border-gray-400
        shadow-md
        rounded-regular
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
  padding = true,
}: {
  children: string | JSX.Element;
  selected: boolean;
  hasBorder?: boolean;
  fullWidth?: boolean;
  padding?: boolean;
}) {
  return (
    <div
      className={`
        rounded-regular
        font-medium 
        text-emphasis 
        text-sm
        ${padding && "p-2"}
        select-none
        ${hasBorder ? "border border-border" : ""}
        ${selected ? "bg-hover" : "hover:bg-hover-light"}
        ${fullWidth ? "w-full" : ""}`}
    >
      {children}
    </div>
  );
}
