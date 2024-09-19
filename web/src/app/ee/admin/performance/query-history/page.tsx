"use client";

import { AdminPageTitle } from "@/components/admin/Title";
import { QueryHistoryTable } from "./QueryHistoryTable";
import { DatabaseIcon } from "@/components/icons/icons";

export default function QueryHistoryPage() {
  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="container">
        <AdminPageTitle
          title="Query History"
          icon={<DatabaseIcon size={32} />}
        />

        <QueryHistoryTable />
      </div>
    </div>
  );
}
