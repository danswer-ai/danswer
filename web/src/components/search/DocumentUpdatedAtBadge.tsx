import { timeAgo } from "@/lib/time";
import { Badge } from "../ui/badge";

export function DocumentUpdatedAtBadge({ updatedAt }: { updatedAt: string }) {
  return (
    <Badge variant="secondary" className="pt-2">
      {"Updated " + timeAgo(updatedAt)}
    </Badge>
  );
}
