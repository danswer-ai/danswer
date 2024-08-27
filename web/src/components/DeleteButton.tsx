import { FiTrash } from "react-icons/fi";
import { Button } from "./ui/button";

export function DeleteButton({
  onClick,
  disabled,
}: {
  onClick?: (event: React.MouseEvent<HTMLElement>) => void | Promise<void>;
  disabled?: boolean;
}) {
  return (
    <Button onClick={onClick} variant="destructive" disabled={disabled}>
      <FiTrash className="mr-1 my-auto" />
      Delete
    </Button>
  );
}
