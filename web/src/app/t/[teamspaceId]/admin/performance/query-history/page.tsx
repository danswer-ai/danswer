"use client";

import { QueryHistoryTable } from "@/app/ee/admin/performance/query-history/QueryHistoryTable";
import { AdminPageTitle } from "@/components/admin/Title";
import { DatabaseIcon } from "@/components/icons/icons";
import { useParams } from "next/navigation";

export default function QueryHistoryPage() {
  const { teamspaceId } = useParams();
  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="container">
        <AdminPageTitle
          title="Query History"
          icon={<DatabaseIcon size={32} />}
        />

        <QueryHistoryTable teamspaceId={teamspaceId[0]} />
      </div>
    </div>
  );
}
