import { useState } from "react";
import { FiFileText, FiX } from "react-icons/fi";

export function DocumentPreview({ fileName }: { fileName: string }) {
  return (
    <div
      className="
        flex
        items-center
        p-2
        bg-hover-light
        border
        border-border
        rounded-md
        box-border
        h-16
      "
    >
      <div className="flex-shrink-0">
        <div
          className="
            w-12
            h-12
            bg-document
            flex
            items-center
            justify-center
            rounded-md
          "
        >
          <FiFileText className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className="ml-4">
        <div className="font-medium truncate max-w-48">{fileName}</div>
        <div className="text-subtle text-sm">Document</div>
      </div>
    </div>
  );
}
