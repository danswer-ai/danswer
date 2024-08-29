"use client";

import { useRouter } from "next/navigation";

import { FiChevronLeft } from "react-icons/fi";
import { Button } from "./ui/button";

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
      <FiChevronLeft className="mr-1 my-auto" />
      Back
    </Button>
  );
}
