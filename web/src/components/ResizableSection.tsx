import React, { useState } from "react";

export function ResizableSection({ children }: { children: JSX.Element }) {
  const [width, setWidth] = useState<number>(200); // Initial width with type annotation

  const startResizing = (mouseDownEvent: React.MouseEvent<HTMLDivElement>) => {
    // Record the initial position of the mouse
    const startX = mouseDownEvent.clientX;

    const handleMouseMove = (mouseMoveEvent: MouseEvent) => {
        // Calculate the new width
        const delta = startX - mouseMoveEvent.clientX;
        const newWidth = Math.max(width - delta, 10); // Prevent the width from going negative or too small
        setWidth(newWidth);
    };

    const stopResizing = () => {
      // Remove the event listeners
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopResizing);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopResizing);
  };

  return (
    <div className="flex">
      <div
        onMouseDown={startResizing}
        className="resize-handle cursor-col-resize"
      >
        hi
      </div>
      <div style={{ width: `${width}px` }} className="resize-section">
        {children}
      </div>
    </div>
  );
}

export default ResizableSection;
