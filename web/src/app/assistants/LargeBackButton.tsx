"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function LargeBackButton() {
  const router = useRouter();
  return (
    <div className="cursor-pointer" onClick={() => router.back()}>
      <ChevronLeft
        className="mr-1 my-auto p-1 hover:bg-hover rounded cursor-pointer"
        size={32}
      />
    </div>
  );
}
