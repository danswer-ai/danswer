import { Divider } from "@tremor/react";
import { FiX } from "react-icons/fi";

interface ModalProps {
  children: JSX.Element | string;
  title?: JSX.Element | string;
  onOutsideClick?: () => void;
  className?: string;
  width?: string;
  titleSize?: string;
  hideDividerForTitle?: boolean;
  noPadding?: boolean;
}

export function Modal({
  children,
  title,
  onOutsideClick,
  className,
  width,
  titleSize,
  hideDividerForTitle,
  noPadding,
}: ModalProps) {
  return (
    <div>
      <div
        className={`
        fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm
        flex items-center justify-center z-50
      `}
        onClick={onOutsideClick}
      >
        <div
          className={`
          bg-background rounded shadow-lg
          relative mx-6 md:mx-0 ${width ?? "md:w-1/2"} text-sm 
          ${noPadding ? "" : "p-8"}
          ${className}
        `}
          onClick={(event) => event.stopPropagation()}
        >
          {onOutsideClick && (
            <div
              onClick={onOutsideClick}
              className="absolute top-6 right-6 cursor-pointer"
            >
              <FiX size={20} />
            </div>
          )}
          <>
            {title && (
              <div className="mb-4">
                <h2
                  className={"my-auto font-bold " + (titleSize || "text-2xl")}
                >
                  {title}
                </h2>
                {!hideDividerForTitle && <Divider />}
              </div>
            )}
          </>
          {children}
        </div>
      </div>
    </div>
  );
}
