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
        <div className="space-y-4">
          <div>
            <Label>Share link</Label>
            <div className="flex items-center gap-2">
              <Input />
              <Button variant="outline" size="icon">
                <Copy size={16} />
              </Button>
            </div>
          </div>

          <div>
            <Label>Invite user</Label>
            <div className="flex items-center gap-2">
              <Input placeholder="Enter email" />
              <Select>
                <SelectTrigger className="w-full lg:w-64">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Label className="pt-1.5">
              We&rsquo;ll send them instructions and a magic link to join the
              workspace via email.
            </Label>
          </div>

          <div className="flex gap-2 justify-end pt-6">
            <Button variant="ghost" onClick={() => setIsInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button>Send Invite</Button>
          </div>
        </div>
      </CustomModal>
      <div className="rounded-md bg-muted w-full p-4 min-h-32 flex flex-col justify-between">
        <h3>
          Data Source <span className="px-2 font-normal">|</span>{" "}
          {teamspace.document_sets.length}
        </h3>

        {teamspace.document_sets.length > 0 ? (
          <div className="pt-4 flex flex-wrap gap-2">
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
