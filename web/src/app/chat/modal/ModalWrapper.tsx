import { XIcon } from "@/components/icons/icons";

export const ModalWrapper = ({
  children,
  bgClassName,
  modalClassName,
  onClose,
}: {
  children: JSX.Element;
  bgClassName?: string;
  modalClassName?: string;
  onClose?: () => void;
}) => {
  return (
    <div
      onClick={() => onClose && onClose()}
      className={
        "fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm " +
        "flex items-center justify-center z-50 " +
        (bgClassName || "")
      }
    >
      <div
        onClick={(e) => {
          if (onClose) {
            e.stopPropagation();
          }
        }}
        className={
          "bg-background text-emphasis p-8 rounded shadow-xl w-3/4 max-w-3xl shadow " +
          (modalClassName || "")
        }
      >
        {onClose && (
          <div className="w-full cursor-pointer flex justify-end">
            <button onClick={onClose}>
              <XIcon />
            </button>
          </div>
        )}

        {children}
      </div>
    </div>
  );
};
