import { useState } from "react";

interface HoverPopupProps {
  mainContent: string | JSX.Element;
  popupContent: string | JSX.Element;
  classNameModifications?: string;
  direction?: "left" | "bottom" | "top";
  style?: "basic" | "dark";
}

export const HoverPopup = ({
  mainContent,
  popupContent,
  classNameModifications,
  direction = "bottom",
  style = "basic",
}: HoverPopupProps) => {
  const [hovered, setHovered] = useState(false);

  let popupDirectionClass;
  switch (direction) {
    case "left":
      popupDirectionClass = "top-0 left-0 transform translate-x-[-110%]";
      break;
    case "bottom":
      popupDirectionClass = "top-0 left-0 mt-6 pt-2";
      break;
    case "top":
      popupDirectionClass = "top-0 left-0 translate-y-[-100%] pb-2";
      break;
  }

  return (
    <div
      className="relative flex"
      onMouseEnter={() => {
        setHovered(true);
      }}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <div className={`absolute ${popupDirectionClass} z-30`}>
          <div
            className={
              `px-3 py-2 rounded bg-background border border-border` +
              (classNameModifications || "")
            }
          >
            {popupContent}
          </div>
        </div>
      )}
      <div>{mainContent}</div>
    </div>
  );
};
