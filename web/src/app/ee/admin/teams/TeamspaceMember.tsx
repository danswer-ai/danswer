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

interface TeamspaceMemberProps {
  teamspace: Teamspace & { gradient: string };
  refreshTeamspaces: () => void;
}

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
      setSelectedUsers(filteredUsers!.map((user) => user.email));
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
                    {/* <TableHead>Workspace</TableHead> */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedUsers.includes(user.email)}
                          onCheckedChange={() =>
                            handleCheckboxChange(user.email)
                          }
                        />
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
                          {/* <span className="text-xs">@username</span> */}
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      {/* <TableCell>{user.workspace?.workspace_name}</TableCell> */}
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
            <Button onClick={handleRemoveUser}>
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

// const InviteModal = ({
//   setOpenModal,
//   setCloseModal,
//   isInviteModalOpen,
//   disabled,
//   teamspaceId,
//   refreshTeamspaces,
// }: {
//   setOpenModal: () => void;
//   setCloseModal: () => void;
//   isInviteModalOpen: boolean;
//   disabled: boolean;
//   teamspaceId: number;
//   refreshTeamspaces: () => void;
// }) => {
//   const router = useRouter();
//   const { toast } = useToast();
//   const [email, setEmail] = useState("");
//   const [role, setRole] = useState("");

//   const handleInvite = async () => {
//     try {
//       const response = await fetch(
//         `/api/manage/admin/teamspace/user-add/${teamspaceId}`,
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify([email]),
//         }
//       );

//       if (!response.ok) throw new Error("Failed to add user");

//       if (role) {
//         const roleResponse = await fetch(
//           `/api/manage/admin/teamspace/user-role/${teamspaceId}`,
//           {
//             method: "PATCH",
//             headers: {
//               "Content-Type": "application/json",
//             },
//             body: JSON.stringify({ user_email: email, new_role: role }),
//           }
//         );

//         if (!roleResponse.ok) throw new Error("Failed to update user role");
//       }

//       router.refresh();
//       refreshTeamspaces();
//       toast({
//         title: "Success",
//         description: "User invited successfully",
//         variant: "success",
//       });
//       setEmail("");
//       setRole("");
//       setCloseModal();
//     } catch (error) {
//       console.error(error);
//       toast({
//         title: "Error",
//         description: "Error inviting user",
//         variant: "destructive",
//       });
//     }
//   };

//   return (
//     <CustomModal
//       trigger={
//         <div className="flex justify-end">
//           <Button onClick={setOpenModal} disabled={disabled}>
//             <Plus size={16} /> Add
//           </Button>
//         </div>
//       }
//       title="Invite to Your Teamspace"
//       description="Your invite link has been created. Share this link to join your workspace."
//       open={isInviteModalOpen}
//       onClose={setCloseModal}
//     >
//       <div className="space-y-4 pt-2">
//         <div className="grid gap-1.5">
//           <Label className="text-sm font-semibold leading-none">
//             Invite user
//           </Label>
//           <div className="flex items-center gap-2">
//             <Input
//               placeholder="Enter email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//             />
//             <Select onValueChange={(value) => setRole(value)}>
//               <SelectTrigger className="w-full lg:w-64">
//                 <SelectValue placeholder="Role" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="member">Member</SelectItem>
//                 <SelectItem value="admin">Admin</SelectItem>
//               </SelectContent>
//             </Select>
//           </div>
//           <Label className="text-sm font-semibold leading-none pt-1.5">
//             We’ll send them instructions and a magic link to join the workspace
//             via email.
//           </Label>
//         </div>

//         <div className="flex gap-2 justify-end pt-6">
//           <Button variant="ghost" onClick={setCloseModal}>
//             Cancel
//           </Button>
//           <Button onClick={handleInvite}>Add User</Button>
//         </div>
//       </div>
//     </CustomModal>
//   );
// };

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
            className={`rounded-md bg-muted w-full p-4 min-h-36 flex flex-col justify-between ${teamspace.is_up_to_date && !teamspace.is_up_for_deletion && "cursor-pointer"}`}
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
                    trigger={
                      <div
                        key={user.id}
                        className={`bg-brand-500 w-10 h-10 rounded-full flex items-center justify-center font-semibold text-inverted text-lg uppercase border-[1px] border-white ${user.email == teamspace.creator.email && "border-red-500"}`}
                      >
                        {user.full_name!.charAt(0)}
                      </div>
                    }
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
        <div className="space-y-12">
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
