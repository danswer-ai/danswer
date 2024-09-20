"use client";

import { CustomModal } from "@/components/CustomModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTeamspaces } from "@/lib/hooks";
import { Teamspace } from "@/lib/types";
import { Copy, Plus, EllipsisVertical, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface TeamspaceMemberProps {
  teamspace: Teamspace & { gradient: string };
  selectedTeamspaceId?: number;
}

export const TeamspaceMember = ({
  teamspace,
  selectedTeamspaceId,
}: TeamspaceMemberProps) => {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const { isLoading, error, data, refreshTeamspaces } = useTeamspaces();

  return (
    <div className="relative">
      <CustomModal
        trigger={
          <Button
            className="absolute top-4 right-4"
            onClick={() => setIsInviteModalOpen(true)}
          >
            <Plus size={16} /> Invite
          </Button>
        }
        title="Invite to Your Teamspace"
        description="Your invite link has been created. Share this link to join
            your workspace."
        open={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      >
        <div className="space-y-4 pt-5">
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
      <CustomModal
        trigger={
          <div
            className="rounded-md bg-muted w-full p-4 min-h-32 flex flex-col justify-between cursor-pointer"
            onClick={() => setIsMemberModalOpen(true)}
          >
            <h3>
              Members <span className="px-2 font-normal">|</span>{" "}
              {teamspace.users.length}
            </h3>

            {teamspace.users.length > 0 ? (
              <div className="pt-4 flex flex-wrap -space-x-3">
                {teamspace.users.map((teamspace) => (
                  <div
                    key={teamspace.id}
                    className={`bg-primary w-10 h-10 rounded-full flex items-center justify-center font-semibold text-inverted text-lg`}
                  >
                    {teamspace.full_name!.charAt(0)}
                  </div>
                ))}
                {teamspace.users.length > 4 && (
                  <div className="bg-background w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold">
                    +{teamspace.users.length - 4}
                  </div>
                )}
              </div>
            ) : (
              <p>There are no member.</p>
            )}
          </div>
        }
        title="Member"
        open={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
      >
        {teamspace.users.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Checkbox />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Email Address</TableHead>
                    <TableHead>Teams</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamspace.users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Checkbox />
                      </TableCell>
                      <TableCell className="flex items-center gap-2">
                        <div className="border rounded-full h-10 w-10 flex items-center justify-center">
                          <User />
                        </div>
                        <div className="grid">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold whitespace-nowrap">
                              {user.full_name}
                            </span>
                            <Badge
                              variant={
                                user.role === "admin" ? "success" : "secondary"
                              }
                            >
                              {user.role.charAt(0).toUpperCase() +
                                user.role.slice(1)}
                            </Badge>
                          </div>
                          <span className="text-xs">@username</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.status}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.workspace?.workspace_name}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <EllipsisVertical size={20} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          "There are no member."
        )}
      </CustomModal>
    </div>
  );
};
