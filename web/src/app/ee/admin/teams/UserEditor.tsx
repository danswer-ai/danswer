import { User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/Combobox";

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

  const availableUsers = allUsers
    .filter(
      (user) =>
        !selectedUserIds.includes(user.id) &&
        !existingUsers.map((user) => user.id).includes(user.id)
    )
    .map((user) => ({
      value: user.id,
      label: user.email,
    }));

  return (
    <>
      <div className="flex">
        <Combobox
          items={availableUsers}
          onSelect={(selectedValue) => {
            if (selectedValue) {
              setSelectedUserIds([
                ...Array.from(new Set([...selectedUserIds, selectedValue])),
              ]);
            }
          }}
          placeholder="user"
          label="Select user"
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

      <div className="flex flex-wrap gap-2 pt-2">
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
              className="cursor-pointer hover:bg-opacity-80"
            >
              {selectedUser.email}
              <X className="ml-1 my-auto cursor-pointer" size={14} />
            </Badge>
          ))}
      </div>
    </>
  );
};
