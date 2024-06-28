import { Divider } from "@tremor/react";
import { useContext } from "react";
import { FiX } from "react-icons/fi";
import { SettingsContext } from "./settings/SettingsProvider";

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
  const combinedSettings = useContext(SettingsContext);
  if (!combinedSettings) {
    return null;
  }
  const settings = combinedSettings.settings;

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
          relative 
          mobile:w-[95%] mobile:mx-12
          ${width ?? "w-1/2"} text-sm 
          ${noPadding ? "" : "p-8"}
          ${className}
        `}
          onClick={(event) => event.stopPropagation()}
        >
          {title && (
            <>
              <div className="flex mb-4">
                <h2
                  className={"my-auto font-bold " + (titleSize || "text-2xl")}
                >
                  {title}
                </h2>
                {onOutsideClick && (
                  <div
                    onClick={onOutsideClick}
                    className="my-auto ml-auto p-2 hover:bg-hover rounded cursor-pointer"
                  >
                    <FiX size={20} />
                  </div>
                )}
              </div>
              {!hideDividerForTitle && <Divider />}
            </>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
