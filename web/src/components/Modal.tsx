interface ModalProps {
  children: JSX.Element | string;
  title?: JSX.Element | string;
  onOutsideClick?: () => void;
  className?: string;
}

export function Modal({
  children,
  title,
  onOutsideClick,
  className,
}: ModalProps) {
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
          bg-background rounded shadow-lg
          relative w-1/2 text-sm
          ${className}
        `}
          onClick={(event) => event.stopPropagation()}
        >
          {title && (
            <h2 className="text-xl font-bold mb-3 border-b border-border pt-4 pb-3 bg-background-strong px-6">
              {title}
            </h2>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
