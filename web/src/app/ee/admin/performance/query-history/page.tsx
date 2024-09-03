"use client";

import { AdminPageTitle } from "@/components/admin/Title";
import { QueryHistoryTable } from "./QueryHistoryTable";
import { DatabaseIcon } from "@/components/icons/icons";

export default function QueryHistoryPage() {
  return (
    <main className="container mx-auto py-24 md:py-32 lg:pt-16">
      <AdminPageTitle title="Query History" icon={<DatabaseIcon size={32} />} />

      <QueryHistoryTable />
    </main>
  );
}
