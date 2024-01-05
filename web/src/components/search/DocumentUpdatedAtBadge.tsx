import { timeAgo } from "@/lib/time";
import { MetadataBadge } from "../MetadataBadge";

export function DocumentUpdatedAtBadge({ updatedAt }: { updatedAt: string }) {
  return <MetadataBadge value={"Updated " + timeAgo(updatedAt)} />;
}
