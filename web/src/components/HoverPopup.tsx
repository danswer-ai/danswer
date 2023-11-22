import { useState } from "react";

interface HoverPopupProps {
  mainContent: string | JSX.Element;
  popupContent: string | JSX.Element;
  classNameModifications?: string;
  direction?: "left" | "bottom";
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
              `px-3 py-2 rounded ` +
              (style === "dark"
                ? "bg-dark-tremor-background-muted border border-gray-800"
                : "bg-gray-800 shadow-lg") +
              (classNameModifications || "")
            }
          >
            {popupContent}
          </div>
        </div>
      )}
      <div className="z-20">{mainContent}</div>
    </div>
  );
};
