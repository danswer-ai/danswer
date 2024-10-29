"use client";
import { useState } from "react";
import { AdminPageTitle } from "@/components/admin/Title";
import { UsersIcon } from "@/components/icons/icons";
import { AllUsers } from "./AllUsers";
import { PendingInvites } from "./PedingInvites";
import { Separator } from "@/components/ui/separator";

const Page = () => {
  const [q, setQ] = useState("");
  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="container">
        <AdminPageTitle title="Manage Users" icon={<UsersIcon size={32} />} />
        <div className="pb-20 w-full">
          <AllUsers q={q} />
          <Separator className="my-10" />
          <PendingInvites q={q} />
        </div>
      </div>
    </div>
  );
};

export default Page;
