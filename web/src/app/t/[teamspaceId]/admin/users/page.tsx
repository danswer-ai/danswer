"use client";
import { useState } from "react";
import { AdminPageTitle } from "@/components/admin/Title";
import { UsersIcon } from "@/components/icons/icons";
import { Separator } from "@/components/ui/separator";
import { AllUsers } from "@/app/admin/users/AllUsers";
import { PendingInvites } from "@/app/admin/users/PedingInvites";
import { useParams } from "next/navigation";

const Page = () => {
  const { teamspaceId } = useParams();
  const [q, setQ] = useState("");
  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="container">
        <AdminPageTitle title="Manage Users" icon={<UsersIcon size={32} />} />
        <div className="pb-20 w-full">
          <AllUsers q={q} teamspaceId={teamspaceId} />
          {/* <Separator className="my-10" /> */}
          {/* <PendingInvites q={q} teamspaceId={teamspaceId} /> */}
        </div>
      </div>
    </div>
  );
};

export default Page;
