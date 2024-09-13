"use client";

import { errorHandlingFetcher, RedirectError } from "@/lib/fetcher";
import useSWR from "swr";
import { CustomModal } from "../CustomModal";
import { Button } from "../ui/button";
import { useState } from "react";
import { CircleAlert } from "lucide-react";

export const HealthCheckBanner = () => {
  const { error } = useSWR("/api/health", errorHandlingFetcher);
  const [isModalOpen, setIsModalOpen] = useState(true);

  if (!error) {
    return null;
  }

  if (error instanceof RedirectError) {
    return (
      <CustomModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        trigger={null}
        title="You have been logged out!"
      >
        <div className="flex flex-col gap-y-4">
          <p className="text-lg pb-4">
            You can click &quot;Log in&quot; to log back in! Apologies for the
            inconvenience.
          </p>
          <Button className="mx-auto">
            <a href="/auth/login">Log in</a>
          </Button>
        </div>
      </CustomModal>
    );
  } else {
    return (
      <div className="text-sm bg-destructive p-3 rounded-xs border-hidden flex gap-2 m-1.5 mb-0">
        <CircleAlert size={20} className="min-w-5 min-h-5" />
        <p className="font-bold">The backend is currently unavailable.</p>

        <p className="ml-2">
          If this is your initial setup or you just updated your enMedD AI
          deployment, this is likely because the backend is still starting up.
          Give it a minute or two, and then refresh the page. If that does not
          work, make sure the backend is setup and/or contact an administrator.
        </p>
      </div>
    );
  }
};
