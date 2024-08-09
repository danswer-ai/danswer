import { CustomCheckbox } from "./CustomCheckbox";
import { Checkbox } from "@/components/ui/checkbox";

export function Bubble({
  isSelected,
  onClick,
  children,
  showCheckbox = false,
  notSelectable = false,
}: {
  isSelected: boolean;
  onClick?: () => void;
  children: string | JSX.Element;
  showCheckbox?: boolean;
  notSelectable?: boolean;
}) {
  return (
    <div
      className={
        `
      px-3 
      py-1
      rounded-regular 
      border
      border-border 
      w-fit 
      items-center
      gap-2
      flex` +
        (notSelectable
          ? " bg-background cursor-default"
          : isSelected
          ? " bg-hover cursor-pointer"
          : " bg-background hover:bg-hover-light cursor-pointer")
      }
      onClick={onClick}
    >
      <div className="my-auto">{children}</div>
      {showCheckbox && <Checkbox checked={isSelected} onChange={() => null} />}
    </div>
  );
}
