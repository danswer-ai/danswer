import { FiTrash } from "react-icons/fi";
import { ModalWrapper } from "./ModalWrapper";
import { BasicClickable } from "@/components/BasicClickable";

export const GenericConfirmModal = ({
  title,
  message,
  confirmText = "Confirm",
  onClose,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmText?: string;
  onClose: () => void;
  onConfirm: () => void;
}) => {
  return (
    <ModalWrapper onClose={onClose}>
      <>
        <div className="flex mb-4">
          <h2 className="my-auto text-2xl font-bold">{title}</h2>
        </div>
        <p className="mb-4">{message}</p>
        <div className="flex">
          <div className="mx-auto">
            <BasicClickable onClick={onConfirm}>
              <div className="flex mx-2">
                <FiTrash className="my-auto mr-2" />
                {confirmText}
              </div>
            </BasicClickable>
          </div>
        </div>
      </>
    </ModalWrapper>
  );
};
