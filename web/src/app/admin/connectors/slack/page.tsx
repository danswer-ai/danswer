"use client";

import { SlackForm } from "@/components/admin/connectors/SlackForm";

export default function Slack() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="border-solid border-slate-600 border-b mb-4">
        <h1 className="text-3xl font-bold mb-2 pl-2">Slack</h1>
      </div>
      <h2 className="text-xl font-bold pl-2 mb-2 mt-6 ml-auto mr-auto">
        Config
      </h2>
      <div className="border-solid border-slate-600 border rounded-md p-6">
        <SlackForm onSubmit={(success) => console.log(success)} />
      </div>
    </div>
  );
}
