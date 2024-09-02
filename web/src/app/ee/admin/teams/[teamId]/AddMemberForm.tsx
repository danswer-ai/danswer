import { Modal } from "@/components/Modal";
import { updateUserGroup } from "./lib";
import { User, UserGroup } from "@/lib/types";
import { UserEditor } from "../UserEditor";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface AddMemberFormProps {
  users: User[];
  teamspace: Teamspace;
  onClose: () => void;
}

export const AddMemberForm: React.FC<AddMemberFormProps> = ({
  users,
  teamspace,
  onClose,
}) => {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const { toast } = useToast();

  return (
    <Modal title="Add New User" onOutsideClick={() => onClose()}>
      <div className="px-6 pt-4 pb-12">
        <UserEditor
          selectedUserIds={selectedUserIds}
          setSelectedUserIds={setSelectedUserIds}
          allUsers={users}
          existingUsers={teamspace.users}
          onSubmit={async (selectedUsers) => {
            const newUserIds = [
              ...Array.from(
                new Set(
                  teamspace.users
                    .map((user) => user.id)
                    .concat(selectedUsers.map((user) => user.id))
                )
              ),
            ];
            const response = await updateTeamspace(teamspace.id, {
              user_ids: newUserIds,
              cc_pair_ids: teamspace.cc_pairs.map((ccPair) => ccPair.id),
            });
            if (response.ok) {
              toast({
                title: "Success",
                description: "Successfully added users to group",
                variant: "success",
              });
              onClose();
            } else {
              const responseJson = await response.json();
              const errorMsg = responseJson.detail || responseJson.message;
              toast({
                title: "Error",
                description: `Failed to add users to group - ${errorMsg}`,
                variant: "destructive",
              });
              onClose();
            }
          }}
        />
      </div>
    </Modal>
  );
};
