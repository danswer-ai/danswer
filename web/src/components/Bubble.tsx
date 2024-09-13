import { CustomCheckbox } from "./CustomCheckbox";
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
      className="cursor-pointer hover:bg-opacity-80"
    >
      <div className="my-auto">{children}</div>
      {showCheckbox && <Checkbox checked={isSelected} onChange={() => null} />}
    </Badge>
  );
}
