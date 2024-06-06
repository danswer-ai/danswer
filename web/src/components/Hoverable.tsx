import { useState } from "react";
import { IconType } from "react-icons";

const ICON_SIZE = 15;

export const Hoverable: React.FC<{
  icon: IconType;
  onClick?: () => void;
  size?: number;
  active?: boolean;
}> = ({ icon, onClick, size = ICON_SIZE, active = false }) => {
  return (
    <div
      className={`hover:bg-hover p-1.5 rounded h-fit cursor-pointer ${active && "bg-hover"}`}
      onClick={onClick}
    >
      {icon({ size: size, className: "my-auto" })}
    </div>
  );
};

export const HoverableWithText: React.FC<{
  icon: IconType;
  onClick?: () => void;
  size?: number;
  active?: boolean;
  appear?: boolean;
  text?: string;
}> = ({ text, appear, icon, onClick, size = ICON_SIZE, active = false }) => {
  return (
    <div
      className={`flex gap-x-2 group hover:bg-hover p-1.5 rounded h-fit cursor-pointer ${active && "bg-hover"}`}
      onClick={onClick}
    >
      {icon({ size: size, className: "my-auto" })}
      {text && (
        <p
          className={`text-xs whitespace-nowrap overflow-hidden  ${(appear || active) && "opacity-0 group-hover:opacity-100 transition-opacity duration-300"} `}
        >
          {text}
        </p>
      )}
    </div>
  );
};
