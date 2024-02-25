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
        "fixed z-50 inset-0 overflow-y-auto bg-black bg-opacity-30 flex justify-center items-center " +
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
        {children}
      </div>
    </div>
  );
};
