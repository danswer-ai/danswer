interface ModalProps {
  children: JSX.Element | string;
  onOutsideClick: () => void;
  title?: JSX.Element | string;
}

export const Modal: React.FC<ModalProps> = ({
  children,
  onOutsideClick,
  title,
}) => {
  return (
    <div>
      <div
        className={`
        fixed inset-0 bg-black bg-opacity-50 
        flex items-center justify-center z-50
      `}
        onClick={onOutsideClick}
      >
        <div
          className={`
          bg-gray-800 rounded-lg border border-gray-700 
          shadow-lg relative w-1/2 text-sm
        `}
          onClick={(event) => event.stopPropagation()}
        >
          {title && (
            <h2 className="text-xl font-bold mb-3 border-b border-gray-600 pt-4 pb-3 bg-gray-700 px-6">
              {title}
            </h2>
          )}
          {children}
        </div>
      </div>
    </div>
  );
};
