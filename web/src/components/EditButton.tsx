"use client";

import { FiEdit } from "react-icons/fi";

export function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <div
      className={`
        my-auto 
        flex 
        mb-1 
        hover:bg-hover dark:hover:bg-neutral-800 
        w-fit 
        p-2 
        cursor-pointer 
        rounded-lg
        border-border dark:border-neutral-900
        text-sm`}
      onClick={onClick}
    >
      <FiEdit className="mr-1 my-auto" />
      Edit
    </div>
  );
}
