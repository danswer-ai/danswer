import { Badge } from "./ui/badge";

export function MetadataBadge({
  icon,
  value,
}: {
  icon?: JSX.Element;
  value: string | JSX.Element;
}) {
  return (
    <Badge variant="secondary">
      {icon && icon}
      <div className="my-auto truncate block">{value}ssss</div>
    </Badge>
  );
}
