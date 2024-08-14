import { timeAgo } from "@/lib/time";
import { Badge } from "../ui/badge";

export function DocumentUpdatedAtBadge({ updatedAt }: { updatedAt: string }) {
  return <Badge variant="secondary">{"Updated " + timeAgo(updatedAt)}</Badge>;
}
