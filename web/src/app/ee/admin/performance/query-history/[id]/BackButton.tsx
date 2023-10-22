"use client";
/* TODO: bring this out of EE */

import { useRouter } from "next/navigation";
import { FiChevronLeft } from "react-icons/fi";

export function BackButton() {
  const router = useRouter();
  return (
    <div
      className="my-auto flex mb-1 hover:bg-gray-800 w-fit pr-2 cursor-pointer rounded-lg"
      onClick={() => router.back()}
    >
      <FiChevronLeft className="mr-1 my-auto" />
      Back
    </div>
  );
}
