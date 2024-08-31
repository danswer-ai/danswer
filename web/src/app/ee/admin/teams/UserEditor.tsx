import { User } from "@/lib/types";
import { FiX } from "react-icons/fi";
import { SearchMultiSelectDropdown } from "@/components/Dropdown";
import { UsersIcon } from "@/components/icons/icons";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UserEditorProps {
  selectedUserIds: string[];
  setSelectedUserIds: (userIds: string[]) => void;
  allUsers: User[];
  existingUsers: User[];
  onSubmit?: (users: User[]) => void;
}

export const UserEditor = ({
  selectedUserIds,
  setSelectedUserIds,
  allUsers,
  existingUsers,
  onSubmit,
}: UserEditorProps) => {
  const selectedUsers = allUsers.filter((user) =>
    selectedUserIds.includes(user.id)
  );

  return (
    <>
      <div className="mb-2 flex flex-wrap gap-x-2">
        {selectedUsers.length > 0 &&
          selectedUsers.map((selectedUser) => (
            <Badge
              key={selectedUser.id}
              onClick={() => {
                setSelectedUserIds(
                  selectedUserIds.filter((userId) => userId !== selectedUser.id)
                );
              }}
              variant="outline"
            >
              {selectedUser.email}{" "}
              <X className="ml-1 my-auto cursor-pointer" size={14} />
            </Badge>
          ))}
      </div>

      <div className="flex">
        <SearchMultiSelectDropdown
          options={allUsers
            .filter(
              (user) =>
                !selectedUserIds.includes(user.id) &&
                !existingUsers.map((user) => user.id).includes(user.id)
            )
            .map((user) => {
              return {
                name: user.email,
                value: user.id,
              };
            })}
          onSelect={(option) => {
            setSelectedUserIds([
              ...Array.from(
                new Set([...selectedUserIds, option.value as string])
              ),
            ]);
          }}
          itemComponent={({ option }) => (
            <div className="flex">
              <UsersIcon className="mr-2 my-auto" />
              {option.name}
              <div className="ml-auto my-auto">
                <Plus size={16} />
              </div>
            </div>
          )}
        />
        {onSubmit && (
          <Button
            className="ml-3 flex-nowrap w-32"
            onClick={() => onSubmit(selectedUsers)}
          >
            Add Users
          </Button>
        )}
      </div>
    </>
  );
};
