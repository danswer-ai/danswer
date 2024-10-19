import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { CustomModal } from "@/components/CustomModal";
import { BasicClickable } from "../BasicClickable";
import { FiTrash } from "react-icons/fi";
import { ModalWrapper } from "./ModalWrapper";

export const DeleteChatModal = ({
  chatSessionName,
  onSubmit,
}: {
  chatSessionName: string;
  onSubmit: () => void;
  additionalDetails?: string;
}) => {
  return (
    <CustomModal
      trigger={
        <div className="hover:bg-background-inverted/10 p-1 rounded">
          <Trash size={16} />
        </div>
      }
      title="Delete chat?"
    >
      <div>
        <div className="pt-2">
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
}: {
  entityType: string;
  entityName: string;
  onClose: () => void;
  onSubmit: () => void;
  additionalDetails?: string;
}) => {
  return (
    <ModalWrapper onClose={onClose}>
      <>
        <div className="flex mb-4">
          <h2 className="my-auto text-2xl font-bold">Delete {entityType}?</h2>
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
    </ModalWrapper>
  );
};
