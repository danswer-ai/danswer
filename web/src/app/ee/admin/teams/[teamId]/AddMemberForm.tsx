import { Modal } from "@/components/Modal";
import { updateTeamspace } from "./lib";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import { User, Teamspace } from "@/lib/types";
import { UserEditor } from "../UserEditor";
import { useState } from "react";

interface AddMemberFormProps {
  users: User[];
  teamspace: Teamspace;
  onClose: () => void;
  setPopup: (popupSpec: PopupSpec) => void;
}

export const AddMemberForm: React.FC<AddMemberFormProps> = ({
  users,
  teamspace,
  onClose,
  setPopup,
}) => {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

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
              setPopup({
                message: "Successfully added users to group",
                type: "success",
              });
              onClose();
            } else {
              const responseJson = await response.json();
              const errorMsg = responseJson.detail || responseJson.message;
              setPopup({
                message: `Failed to add users to group - ${errorMsg}`,
                type: "error",
              });
              onClose();
            }
          }}
        />
      </div>
    </Modal>
  );
};
