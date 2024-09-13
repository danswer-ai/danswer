import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "./ui/badge";

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
    <Badge
      variant={isSelected ? "default" : "outline"}
      onClick={onClick}
      className="cursor-pointer hover:bg-opacity-80 py-1.5 px-3 gap-1.5"
    >
      {children}
      {showCheckbox && <Checkbox checked={isSelected} onChange={() => null} />}
    </Badge>
  );
}
