import { User } from "@/lib/types";
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

  const handleSelect = (selectedValues: string[]) => {
    const selectedIds = selectedValues.map((value) => value);
    setSelectedUserIds(selectedIds); // Update selected user IDs
  };

  return (
    <Combobox
      items={availableUsers}
      onSelect={handleSelect} // Updated onSelect
      placeholder="user"
      label="Select user"
      isOnModal
    />
  );
};
