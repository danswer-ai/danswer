"use client";

import { useRouter } from "next/navigation";

import { Button } from "./ui/button";
import { ChevronLeft } from "lucide-react";

export function BackButton({
  behaviorOverride,
}: {
  behaviorOverride?: () => void;
}) {
  const router = useRouter();

  return (
    <Button
      onClick={() => {
        if (behaviorOverride) {
          behaviorOverride();
        } else {
          router.back();
        }
      }}
      variant="ghost"
      className="mb-5"
    >
      <ChevronLeft className="mr-1 my-auto" size={16} />
      Back
    </Button>
  );
}
