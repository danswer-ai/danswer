import { Divider } from "@tremor/react";
import { FiX } from "react-icons/fi";

interface ModalProps {
  children: JSX.Element | string;
  title?: JSX.Element | string;
  onOutsideClick?: () => void;
  className?: string;
  width?: string;
}

export function Modal({
  children,
  title,
  onOutsideClick,
  className,
  width,
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
          relative ${width ?? "w-1/2"} text-sm p-8
          ${className}
        `}
          onClick={(event) => event.stopPropagation()}
        >
          {title && (
            <>
              <div className="flex mb-4">
                <h2 className="my-auto text-2xl font-bold">{title}</h2>
                {onOutsideClick && (
                  <div
                    onClick={onOutsideClick}
                    className="my-auto ml-auto p-2 hover:bg-hover rounded cursor-pointer"
                  >
                    <FiX size={20} />
                  </div>
                )}
              </div>
              <Divider />
            </>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
