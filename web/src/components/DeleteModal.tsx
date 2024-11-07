import { CustomModal } from "./CustomModal";
import { Button } from "./ui/button";

export function DeleteModal({
  open,
  onClose,
  onSuccess,
  title,
  description,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
}) {
  return (
    <CustomModal
      onClose={onClose}
      title={title}
      trigger={null}
      open={open}
      description={description}
    >
      <div className="flex justify-end items-center gap-2">
        <Button onClick={onClose} variant="ghost">
          Cancel
        </Button>
        <Button onClick={onSuccess}>Confirm</Button>
      </div>
    </CustomModal>
  );
}
