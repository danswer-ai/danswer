import { CustomTooltip } from "./CustomTooltip";
import { Button } from "./ui/button";
import { Trash } from "lucide-react";

export function DeleteButton({
  onClick,
  disabled,
}: {
  onClick?: (event: React.MouseEvent<HTMLElement>) => void | Promise<void>;
  disabled?: boolean;
}) {
  return (
    <CustomTooltip
      trigger={
        <Button
          onClick={onClick}
          variant="ghost"
          size="icon"
          disabled={disabled}
        >
          <Trash className="shrink-0" size={16} />
        </Button>
      }
      asChild
    >
      Delete
    </CustomTooltip>
  );
}
