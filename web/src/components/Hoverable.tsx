import { useState } from "react";
import { IconType } from "react-icons";

const ICON_SIZE = 15;

export type TextHover =
  | {
      text: string;
      animate?: boolean;
    }
  | undefined;

export const Hoverable: React.FC<{
  icon: IconType;
  onClick?: () => void;
  size?: number;
  active?: boolean;
  hoverText?: TextHover;
  show?: boolean;
}> = ({
  hoverText,
  icon,
  onClick,
  size = ICON_SIZE,
  active = false,
  show = false,
}) => {
  return (
    <div
      className={`flex gap-x-1 group hover:bg-hover p-1.5 rounded h-fit cursor-pointer ${active && "bg-hover"}`}
      onClick={onClick}
    >
      {icon({ size: size, className: "my-auto" })}
      {hoverText && (
        <p
          className={`text-xs whitespace-nowrap overflow-hidden  ${hoverText.animate && !active && "opacity-0 group-hover:opacity-100 transition-opacity duration-300"} `}
        >
          {hoverText.text}
        </p>
      )}
    </div>
  );
};
