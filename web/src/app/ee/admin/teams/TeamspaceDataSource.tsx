"use client";

import { CustomModal } from "@/components/CustomModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Teamspace } from "@/lib/types";
import { BookmarkIcon, Copy, Plus } from "lucide-react";
import { useState } from "react";

interface TeamspaceDataSourceProps {
  teamspace: Teamspace & { gradient: string };
}

export const TeamspaceDataSource = ({
  teamspace,
}: TeamspaceDataSourceProps) => {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  return (
    <div className="relative">
      <CustomModal
        trigger={
          <Button
            className="absolute top-4 right-4"
            onClick={() => setIsInviteModalOpen(true)}
          >
            <Plus size={16} /> Add
          </Button>
        }
        title="Add new data source."
        description="Your invite link has been created. Share this link to join
            your workspace."
        open={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      >
        Add
      </CustomModal>
      <div className="rounded-md bg-muted w-full p-4 min-h-32 flex flex-col justify-between">
        <h3>
          Data Source <span className="px-2 font-normal">|</span>{" "}
          {teamspace.document_sets.length}
        </h3>

        {teamspace.document_sets.length > 0 ? (
          <div className="pt-8 flex flex-wrap gap-2">
            {teamspace.cc_pairs.map((cc_pair) => {
              return (
                <Badge key={cc_pair.id} className="truncate whitespace-nowrap">
                  <BookmarkIcon size={16} className="shrink-0" />
                  <span className="truncate">{cc_pair.name}</span>
                </Badge>
              );
            })}
          </div>
        ) : (
          <p>There are data source.</p>
        )}
      </div>
    </div>
  );
};
