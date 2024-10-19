import { X } from "lucide-react";
import { isEventWithinRef } from "@/lib/contains";
import { IconProps, XIcon } from "./icons/icons";
import { useRef } from "react";

interface ModalProps {
  icon?: ({ size, className }: IconProps) => JSX.Element;
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
  icon,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (
      onOutsideClick &&
      modalRef.current &&
      !modalRef.current.contains(e.target as Node) &&
      !isEventWithinRef(e.nativeEvent, modalRef)
    ) {
      onOutsideClick();
    }
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm h-full
        flex items-center justify-center z-50 transition-opacity duration-300 ease-in-out`}
    >
      <div
        className={`
        fixed inset-0 bg-background-inverted bg-opacity-30 backdrop-blur-sm
        flex items-center justify-center z-modal
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
              <X size={20} />
            </div>
          )}
          <>
            {title && (
              <div className="pb-4">
                <h2
                  className={`my-auto flex content-start gap-x-4 font-bold ${
                    titleSize || "text-2xl"
                  }`}
                >
                  {title}
                  {icon && icon({ size: 30 })}
                </h2>
              </div>
            )}
          </>
          {children}
        </div>
      </div>
    </div>
  );
}
