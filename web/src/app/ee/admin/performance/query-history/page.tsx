"use client";

import { QueryHistoryTable } from "./QueryHistoryTable";
import { DatabaseIcon } from "@/components/icons/icons";

export default function QueryHistoryPage() {
  return (
    <main className="pt-4 mx-auto container dark">
      {/* TODO: remove this `dark` once we have a mode selector */}
      <div className="border-solid border-gray-600 border-b pb-2 mb-4 flex">
        <DatabaseIcon size={32} />
        <h1 className="text-3xl font-bold pl-2">Query History</h1>
      </div>
      <QueryHistoryTable />
    </main>
  );
}
