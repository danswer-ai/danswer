import { useState } from "react";

interface HoverPopupProps {
  mainContent: string | JSX.Element;
  popupContent: string | JSX.Element;
  classNameModifications?: string;
  direction?: "left" | "bottom";
}

export const HoverPopup = ({
  mainContent,
  popupContent,
  classNameModifications,
  direction = "bottom",
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
  }

  return (
    <div
      className="relative flex z-20"
      onMouseEnter={() => {
        setHovered(true);
      }}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <div className={`absolute ${popupDirectionClass}`}>
          <div
            className={
              `bg-gray-800 px-3 py-2 rounded shadow-lg z-30 ` +
              (classNameModifications || "")
            }
          >
            {popupContent}
          </div>
        </div>
      )}
      {mainContent}
    </div>
  );
};
