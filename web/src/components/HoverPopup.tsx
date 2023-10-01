import { useState } from "react";

interface HoverPopupProps {
  mainContent: string | JSX.Element;
  popupContent: string | JSX.Element;
  classNameModifications?: string;
}

export const HoverPopup = ({
  mainContent,
  popupContent,
  classNameModifications,
}: HoverPopupProps) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative flex"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <div
          className={
            `absolute top-0 left-0 mt-8 bg-gray-700 px-3 py-2 rounded shadow-lg z-30 ` +
              classNameModifications || ""
          }
        >
          {popupContent}
        </div>
      )}
      {mainContent}
    </div>
  );
};
