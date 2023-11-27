"use client";

import { useRouter } from "next/navigation";

import { FiChevronLeft, FiEdit } from "react-icons/fi";

export function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <div
      className={`
        my-auto 
        flex 
        mb-1 
        hover:bg-gray-800 
        w-fit 
        p-2 
        cursor-pointer 
        rounded-lg
        border-gray-800 
        text-sm`}
      onClick={onClick}
    >
      <FiEdit className="mr-1 my-auto" />
      Edit
    </div>
  );
}
