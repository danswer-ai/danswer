interface ModalProps {
  children: JSX.Element | string;
  title?: JSX.Element | string;
  onOutsideClick?: () => void;
}

export function Modal({ children, title, onOutsideClick }: ModalProps) {
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
          bg-gray-800 rounded-sm shadow-lg
          shadow-lg relative w-1/2 text-sm
        `}
          onClick={(event) => event.stopPropagation()}
        >
          {title && (
            <h2 className="text-xl font-bold mb-3 border-b border-gray-700 pt-4 pb-3 bg-gray-700 px-6">
              {title}
            </h2>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
