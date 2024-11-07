import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { BasicClickable } from "../BasicClickable";
import { FiTrash } from "react-icons/fi";
import { ModalWrapper } from "./ModalWrapper";
import { CustomModal } from "../CustomModal";

export const DeleteChatModal = ({
  chatSessionName,
  onSubmit,
  open,
  openDeleteModal,
  onClose,
}: {
  chatSessionName: string;
  onSubmit: () => void;
  additionalDetails?: string;
  open?: boolean;
  openDeleteModal?: () => void;
  onClose?: () => void;
}) => {
  return (
    <CustomModal
      trigger={
        <div
          className="hover:bg-background-inverted/10 p-1 rounded"
          onClick={openDeleteModal}
        >
          <Trash size={16} />
        </div>
      }
      title="Delete chat?"
      open={open}
      onClose={onClose}
    >
      <div>
        <p className="mb-4">
          Click below to confirm that you want to delete{" "}
          <b>&quot;{chatSessionName.slice(0, 30)}&quot;</b>
        </p>
        <div className="flex">
          <div className="mx-auto pt-2">
            <Button variant="destructive" onClick={onSubmit}>
              <Trash size={16} className="my-auto" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </CustomModal>
  );
};

export const DeleteEntityModal = ({
  onClose,
  onSubmit,
  entityType,
  entityName,
  additionalDetails,
  showDeleteModel,
}: {
  entityType: string;
  entityName: string;
  onClose: () => void;
  onSubmit: () => void;
  additionalDetails?: string;
  showDeleteModel?: boolean;
}) => {
  return (
    <CustomModal
      onClose={onClose}
      title={`Delete ${entityType}?`}
      trigger={null}
      open={showDeleteModel}
    >
      <>
        <div className="flex mb-4">
          <h2 className="my-auto text-2xl font-bold"></h2>
        </div>
        <p className="mb-4">
          Click below to confirm that you want to delete{" "}
          <b>&quot;{entityName}&quot;</b>
        </p>
        {additionalDetails && <p className="mb-4">{additionalDetails}</p>}
        <div className="flex">
          <div className="mx-auto">
            <BasicClickable onClick={onSubmit}>
              <div className="flex mx-2">
                <FiTrash className="my-auto mr-2" />
                Delete
              </div>
            </BasicClickable>
          </div>
        </div>
      </>
    </CustomModal>
  );
};
