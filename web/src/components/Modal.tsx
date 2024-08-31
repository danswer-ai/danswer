import { X } from "lucide-react";

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
                  className={"my-auto font-bold " + (titleSize || "text-2xl")}
                >
                  {title}
                </h2>
                {/*    {!hideDividerForTitle && <Divider />} */}
              </div>
            )}
          </>
          {children}
        </div>
      </div>
    </div>
  );
}
