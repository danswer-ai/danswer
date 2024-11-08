"use client";

import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "next/navigation";
import { FiList } from "react-icons/fi";

export function AssistantsNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  const isGalleryPage = pathname.includes("/assistants/gallery");
  const isMyAssistantsPage = pathname.includes("/assistants/mine");

  return (
    <div className="flex mt-4 mb-8">
      <Button
        onClick={() => router.push("/assistants/mine")}
        variant={isMyAssistantsPage ? "default" : "outline"}
        className={`
          text-base 
          py-6 
          flex-1
          rounded-r-none
          border-r-0
          h-[60px]
          ${isMyAssistantsPage ? 'z-10' : 'z-0'}
        `}
        icon={FiList}
      >
        Your Assistants
      </Button>

      <Button
        onClick={() => router.push("/assistants/gallery")}
        variant={isGalleryPage ? "default" : "outline"}
        className={`
          text-base 
          py-6 
          flex-1
          rounded-l-none
          h-[60px]
          ${isGalleryPage ? 'z-10' : 'z-0'}
        `}
        icon={FiList}
      >
        Assistant Gallery
      </Button>
    </div>
  );
}