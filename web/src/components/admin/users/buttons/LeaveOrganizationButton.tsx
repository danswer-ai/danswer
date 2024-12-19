import { type User } from "@/lib/types";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import userMutationFetcher from "@/lib/admin/users/userMutationFetcher";
import useSWRMutation from "swr/mutation";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { DeleteEntityModal } from "@/components/modals/DeleteEntityModal";
export const LeaveOrganizationButton = ({
  user,
  setPopup,
  mutate,
}: {
  user: User;
  setPopup: (spec: PopupSpec) => void;
  mutate: () => void;
}) => {
  const { trigger, isMutating } = useSWRMutation(
    "/api/manage/admin/leave-organization",
    userMutationFetcher,
    {
      onSuccess: () => {
        mutate();
        setPopup({
          message: "Successfully left the organization!",
          type: "success",
        });
      },
      onError: (errorMsg) =>
        setPopup({
          message: `Unable to leave organization - ${errorMsg}`,
          type: "error",
        }),
    }
  );

  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const handleLeaveOrganization = () => {
    trigger({ user_email: user.email, method: "POST" });
  };

  return (
    <>
      {showLeaveModal && (
        <DeleteEntityModal
          deleteButtonText="Leave"
          entityType="organization"
          entityName="your organization"
          onClose={() => setShowLeaveModal(false)}
          onSubmit={handleLeaveOrganization}
          additionalDetails="You will lose access to all organization data and resources."
        />
      )}

      <Button
        className="w-min"
        onClick={() => setShowLeaveModal(true)}
        disabled={isMutating}
        size="sm"
        variant="destructive"
      >
        Leave Organization
      </Button>
    </>
  );
};
