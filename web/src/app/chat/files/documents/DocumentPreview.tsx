import { useState } from "react";
import { FiFileText, FiX } from "react-icons/fi";

export function FileItem({
  fileName,
  onDelete,
}: {
  fileName: string;
  onDelete?: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative flex items-center p-2 bg-hover-light border border-border rounded-md"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && onDelete && (
        <button
          onClick={onDelete}
          className="
            absolute
            top-0
            right-0
            cursor-pointer
            border-none
            bg-hover
            p-1
            rounded-full
          "
        >
          <FiX />
        </button>
      )}
      <div className="flex-shrink-0">
        <div className="w-12 h-12 bg-document flex items-center justify-center rounded-md">
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
