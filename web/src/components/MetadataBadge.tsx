import { Badge } from "./ui/badge";

export function MetadataBadge({
  icon,
  value,
}: {
  icon?: React.FC<{ size?: number; className?: string }>;
  value: string | JSX.Element;
}) {
  return (
    <Badge variant="secondary" className="pt-2">
      {icon && icon({ size: 12, className: "mr-0.5 my-auto" })}
      <div className="my-auto flex">{value}</div>
    </Badge>
  );
}
