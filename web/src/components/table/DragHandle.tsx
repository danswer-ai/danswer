import React from "react";
import { MdDragIndicator } from "react-icons/md";

export const DragHandle = (props: any) => {
  return (
    <div
      className={
        props.isDragging ? "hover:cursor-grabbing" : "hover:cursor-grab"
      }
      {...props}
    >
      <MdDragIndicator />
    </div>
  );
};
