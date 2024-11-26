import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User } from "@/lib/types";
import { X } from "lucide-react";

interface UserEditorProps {
  selectedUserIds: string[];
  allUsers: User[];
  existingUsers: { user_id: string; role: string }[];
  onAddUser: (user: { user_id: string; role: string }) => void;
  onRemoveUser: (userId: string) => void;
}

export const UserEditor = ({
  selectedUserIds,
  allUsers,
  existingUsers,
  onAddUser,
  onRemoveUser,
}: UserEditorProps) => {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>("basic");

  const availableUsers = allUsers
    .filter(
      (user) =>
        !selectedUserIds.includes(user.id) &&
        !existingUsers.map((user) => user.user_id).includes(user.id)
    )
    .map((user) => ({
      value: user.id,
      label: user.email,
    }));

  const handleAddUser = () => {
    if (!selectedUser || !selectedRole) return;

    onAddUser({ user_id: selectedUser, role: selectedRole });
    setSelectedUser(null);
    setSelectedRole("basic");
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <Select
          onValueChange={(value) => setSelectedUser(value)}
          value={selectedUser || ""}
        >
          <SelectTrigger>
            <SelectValue placeholder="Member" />
          </SelectTrigger>
          <SelectContent>
            {availableUsers.map((user) => (
              <SelectItem key={user.value} value={user.value}>
                {user.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          onValueChange={(value) => setSelectedRole(value)}
          value={selectedRole || ""}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          onClick={handleAddUser}
          disabled={!selectedUser || !selectedRole}
        >
          Add
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {selectedUserIds.map((userId) => {
          const user = allUsers.find((u) => u.id === userId);
          const userRole = existingUsers.find(
            (u) => u.user_id === userId
          )?.role;

          return (
            <Badge
              key={userId}
              className="flex items-center gap-1.5 justify-between"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="truncate inline-block">{user?.email}</span>{" "}
                <span>
                  (
                  {userRole
                    ? userRole.charAt(0).toUpperCase() + userRole.slice(1)
                    : ""}
                  )
                </span>
              </div>
              <X
                onClick={() => onRemoveUser(userId)}
                size={14}
                className="shrink-0 cursor-pointer"
              />
            </Badge>
          );
        })}
      </div>
    </div>
  );
};
