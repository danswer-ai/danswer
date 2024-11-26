"use client";

import { CustomModal } from "@/components/CustomModal";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Teamspace, User } from "@/lib/types";
import { Crown, Minus, Pencil, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CustomTooltip } from "@/components/CustomTooltip";
import { SearchInput } from "@/components/SearchInput";
import { UserProfile } from "@/components/UserProfile";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/user/UserProvider";
import { useTeamspaceUsers, useUsers } from "@/lib/hooks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { InviteUserButton } from "@/app/admin/users/InviteUserButton";

const InviteModal = () => {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  return (
    <div className="flex justify-end">
      <CustomModal
        trigger={
          <Button onClick={() => setIsInviteModalOpen(true)}>
            <Plus size={16} />
            Invite
          </Button>
        }
        open={isInviteModalOpen}
        title="Invite to Your Teamspace"
        description="Your invite link has been created. Share this link to join your workspace."
        onClose={() => setIsInviteModalOpen(false)}
        className="!max-w-[700px]"
      >
        <div className="pb-8">
          <div className="space-y-2 w-full">
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <div className="flex gap-2 w-full">
                <Input placeholder="Email" />
                <Select value="basic">
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button>Send Invite</Button>
            </div>
            <p className="text-xs text-subtle">
              We&apos;ll send them instructions and a magic link to join the
              teamspace via email.
            </p>
          </div>

          <div></div>
        </div>
      </CustomModal>
    </div>
  );
};

interface MemberContentProps {
  isGlobal?: boolean;
  teamspace: Teamspace;
  refreshTeamspaces: () => void;
  searchTerm: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  filteredUsers: User[] | undefined;
  refreshTeamspaceUsers: () => void;
}

const MemberContent = ({
  isGlobal,
  teamspace,
  refreshTeamspaces,
  searchTerm,
  setSearchTerm,
  filteredUsers,
  refreshTeamspaceUsers,
}: MemberContentProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const [isRemoveUserModalOpen, setIsRemoveUserModalOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const { refreshUsers } = useUsers();

  const handleCheckboxChange = (userEmail: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userEmail)
        ? prev.filter((email) => email !== userEmail)
        : [...prev, userEmail]
    );
  };

  useEffect(() => {
    // Check if all users are selected
    const allSelected =
      filteredUsers?.every((user) => selectedUsers.includes(user.email)) ??
      false;
    setIsAllSelected(allSelected);
  }, [selectedUsers, filteredUsers]);

  const handleHeaderCheckboxChange = () => {
    if (isAllSelected) {
      setSelectedUsers([]);
    } else {
      const nonCreatorUsers = filteredUsers!.filter(
        (user) => user.id !== teamspace.creator.id
      );
      setSelectedUsers(nonCreatorUsers.map((user) => user.email));
    }
  };

  const handleRemoveUser = async () => {
    try {
      const response = await fetch(
        `/api/manage/admin/teamspace/user-remove/${teamspace.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(selectedUsers),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to delete user");
      }

      refreshUsers();
      refreshTeamspaces();
      refreshTeamspaceUsers();
      setSelectedUsers([]);
      toast({
        title: "User Removed",
        description:
          "The user has been successfully removed from the teamspace.",
        variant: "success",
      });
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: "Error",
          description: `Failed to remove the user: ${error.message}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "An unknown error occurred while removing the user.",
          variant: "destructive",
        });
      }
    }
  };

  const handleAddUsers = async () => {
    try {
      const response = await fetch(
        `/api/manage/admin/teamspace/user-add/${teamspace.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(selectedUsers),
        }
      );

      if (!response.ok) throw new Error("Failed to add users");

      toast({
        title: "Success",
        description: "Users added successfully",
        variant: "success",
      });

      refreshTeamspaceUsers();
      refreshTeamspaces();
      setSelectedUsers([]);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to add users",
        variant: "destructive",
      });
    }
  };

  const handleRoleChange = async (userEmail: string, newRole: string) => {
    try {
      await fetch(`/api/manage/admin/teamspace/user-role/${teamspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: userEmail,
          new_role: newRole,
        }),
      });
      toast({
        title: "Success",
        description: `Role updated to ${newRole}`,
        variant: "success",
      });
      refreshTeamspaceUsers();
      refreshTeamspaces();
    } catch (error) {
      console.error("Failed to update role", error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className={`space-y-4 ${isGlobal ? "cursor-pointer" : ""}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg leading-none tracking-tight lg:text-xl font-semibold">
            {isGlobal ? "Available" : "Current"} User
          </h2>
          <div className="w-1/2">
            <SearchInput
              placeholder="Search users..."
              value={searchTerm}
              onChange={setSearchTerm}
            />
          </div>
        </div>
        {filteredUsers && filteredUsers?.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleHeaderCheckboxChange}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email Address</TableHead>
                    {!isGlobal && <TableHead>Role</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        {teamspace.creator.id !== user.id && (
                          <Checkbox
                            checked={selectedUsers.includes(user.email)}
                            onCheckedChange={() =>
                              handleCheckboxChange(user.email)
                            }
                          />
                        )}
                      </TableCell>
                      <TableCell className="flex items-center gap-2">
                        <UserProfile user={user} size={40} />
                        <div className="grid">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold whitespace-nowrap">
                              {user.full_name}
                            </span>
                            {!isGlobal && (
                              <Badge
                                variant={
                                  user.role === "admin"
                                    ? "success"
                                    : "secondary"
                                }
                              >
                                {user.role.charAt(0).toUpperCase() +
                                  user.role.slice(1)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {!isGlobal && teamspace.creator.id !== user.id ? (
                          <Select
                            value={user.role || "basic"}
                            onValueChange={(newRole) =>
                              handleRoleChange(user.email, newRole)
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="basic">Basic</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : user.id === teamspace.creator.id ? (
                          <Badge>Creator</Badge>
                        ) : (
                          ""
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <p className="flex items-center justify-center py-4">
            No users found.
          </p>
        )}

        {!isGlobal && selectedUsers.length > 0 && (
          <div className="flex justify-end">
            <Button onClick={handleRemoveUser} variant="destructive">
              <Minus size={16} /> Remove Selected Users
            </Button>
          </div>
        )}

        {isGlobal && selectedUsers.length > 0 && (
          <div className="flex justify-end">
            <Button onClick={handleAddUsers}>
              <Plus size={16} /> Add Selected Users
            </Button>
          </div>
        )}
      </div>
      {isRemoveUserModalOpen && (
        <CustomModal
          trigger={null}
          title="Remove Member"
          open={isRemoveUserModalOpen}
          onClose={() => setIsRemoveUserModalOpen(false)}
          description="You are about to remove this member."
        >
          <div className="pt-6 flex gap-4 justify-center">
            <Button onClick={() => setIsRemoveUserModalOpen(false)}>No</Button>
            <Button variant="destructive" onClick={handleRemoveUser}>
              Yes
            </Button>
          </div>
        </CustomModal>
      )}
    </>
  );
};

interface TeamspaceMemberProps {
  teamspace: Teamspace & { gradient: string };
  refreshTeamspaces: () => void;
}

export const TeamspaceMember = ({
  teamspace,
  refreshTeamspaces,
}: TeamspaceMemberProps) => {
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useUser();
  const { data: users, refreshTeamspaceUsers } = useTeamspaceUsers(
    teamspace.id.toString()
  );

  const filteredUsers = teamspace.users.filter((user) =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const usersToDisplay = [
    ...teamspace.users.sort((a, b) =>
      a.id === user?.id ? -1 : b.id === user?.id ? 1 : 0
    ),
  ].slice(0, 8);

  return (
    <>
      <CustomModal
        trigger={
          <div
            className={`rounded-md bg-background-subtle w-full p-4 min-h-36 flex flex-col justify-between ${teamspace.is_up_to_date && !teamspace.is_up_for_deletion && "cursor-pointer"}`}
            onClick={() =>
              setIsMemberModalOpen(
                teamspace.is_up_to_date && !teamspace.is_up_for_deletion
                  ? true
                  : false
              )
            }
          >
            <div className="flex items-center justify-between">
              <h3>
                Members <span className="px-2 font-normal">|</span>{" "}
                {teamspace.users.length}
              </h3>
              {teamspace.is_up_to_date && !teamspace.is_up_for_deletion && (
                <Pencil size={16} />
              )}
            </div>

            {teamspace.users.length > 0 ? (
              <div className="pt-8 flex flex-wrap -space-x-3">
                {usersToDisplay.map((user) => (
                  <CustomTooltip
                    variant="white"
                    key={user.id}
                    trigger={<UserProfile user={user} />}
                  >
                    {user.email == teamspace.creator.email && (
                      <Crown size={16} className="me-2" />
                    )}
                    {user.full_name}
                  </CustomTooltip>
                ))}
                {teamspace.users.length > 8 && (
                  <div className="bg-background w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold">
                    +{teamspace.users.length - 8}
                  </div>
                )}
              </div>
            ) : (
              <p>There are no member.</p>
            )}
          </div>
        }
        title="Members"
        open={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
      >
        <div className="space-y-12 pb-12">
          {/* <InviteModal /> */}
          <div className="flex justify-end">
            <InviteUserButton
              teamspaceId={teamspace.id.toString()}
              isTeamspaceModal
            />
          </div>

          <MemberContent
            teamspace={teamspace}
            refreshTeamspaces={refreshTeamspaces}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filteredUsers={filteredUsers}
            refreshTeamspaceUsers={refreshTeamspaceUsers}
          />

          <MemberContent
            isGlobal
            teamspace={teamspace}
            refreshTeamspaces={refreshTeamspaces}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filteredUsers={users}
            refreshTeamspaceUsers={refreshTeamspaceUsers}
          />
        </div>
      </CustomModal>
    </>
  );
};
