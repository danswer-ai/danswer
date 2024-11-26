import { ModalWrapper } from "@/components/modals/ModalWrapper";
import { CustomModal } from "../CustomModal";
import { Button } from "../ui/button";

export const NoAssistantModal = ({
  isAdmin,
  open,
  onClose,
}: {
  isAdmin: boolean;
  open?: boolean;
  onClose?: () => void;
}) => {
  return (
    <CustomModal
      title="No Assistant Available"
      trigger={null}
      open={open}
      onClose={onClose}
    >
      <>
        <p className="text-gray-600 mb-4">
          You currently have no assistant configured. To use this feature, you
          need to take action.
        </p>
        {isAdmin ? (
          <>
            <p className="text-gray-600 mb-4">
              As an administrator, you can create a new assistant by visiting
              the admin panel.
            </p>
            <Button
              onClick={() => {
                window.location.href = "/admin/assistants";
              }}
              className="w-full"
            >
              Go to Admin Panel
            </Button>
          </>
        ) : (
          <p className="text-gray-600 mb-2">
            Please contact your administrator to configure an assistant for you.
          </p>
        )}
      </>
    </CustomModal>
  );
};
