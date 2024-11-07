"use client";

import { Main } from "@/app/admin/documents/sets/Main";
import { AdminPageTitle } from "@/components/admin/Title";
import { Bookmark } from "lucide-react";
import { useParams } from "next/navigation";

const Page = () => {
  const { teamspaceId } = useParams();

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="container">
        <AdminPageTitle icon={<Bookmark size={32} />} title="Document Sets" />

        <Main teamspaceId={teamspaceId} />
      </div>
    </div>
  );
};

export default Page;
