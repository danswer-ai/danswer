"use client";

import { AdminPageTitle } from "@/components/admin/Title";
import { LLMConfiguration } from "./LLMConfiguration";
import { Cpu } from "lucide-react";

const Page = () => {
  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="container">
        <AdminPageTitle
          title="LLM Setup"
          icon={<Cpu size={32} className="my-auto" />}
        />

        <LLMConfiguration />
      </div>
    </div>
  );
};

export default Page;
