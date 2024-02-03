import { useState } from "react";

interface HoverPopupProps {
  mainContent: string | JSX.Element;
  popupContent: string | JSX.Element;
  classNameModifications?: string;
  direction?: "left" | "left-top" | "bottom" | "top";
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
  let popupStyle = {};
  switch (direction) {
    case "left":
      popupDirectionClass = "top-0 left-0 transform";
      popupStyle = { transform: "translateX(calc(-100% - 5px))" };
      break;
    case "left-top":
      popupDirectionClass = "bottom-0 left-0";
      popupStyle = { transform: "translate(calc(-100% - 5px), 0)" };
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
        <div
          className={`absolute ${popupDirectionClass} z-30`}
          style={popupStyle}
        >
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
