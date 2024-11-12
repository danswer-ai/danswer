import { timeAgo } from "@/lib/time";
import { Badge } from "../ui/badge";

export function DocumentUpdatedAtBadge({ updatedAt }: { updatedAt: string }) {
  return (
    <Badge variant="secondary">
      <p className="truncate w-full">{"Updated " + timeAgo(updatedAt)}</p>
    </Badge>
  );
}
