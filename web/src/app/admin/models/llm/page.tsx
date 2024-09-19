"use client";

import { AdminPageTitle } from "@/components/admin/Title";
import { FiCpu } from "react-icons/fi";
import { LLMConfiguration } from "./LLMConfiguration";

const Page = () => {
  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="container">
        <AdminPageTitle
          title="LLM Setup"
          icon={<FiCpu size={32} className="my-auto" />}
        />

        <LLMConfiguration />
      </div>
    </div>
  );
};

export default Page;
