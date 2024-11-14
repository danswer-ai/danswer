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
    <div className="relative flex flex-col items-center mt-4 mb-8">
      <div className="inline-flex relative">
        <Button
          onClick={() => router.push("/assistants/mine")}
          variant="ghost"
          className={`
            text-base 
            py-6 
            w-[200px] 
            h-[50px] 
            relative
            rounded-none
            ${isMyAssistantsPage ? 'border-b-2 border-gray-800 font-bold' : ''}
          `}
          icon={FiList}
        >
          Your Assistants
        </Button>

        <Button
          onClick={() => router.push("/assistants/gallery")}
          variant="ghost"
          className={`
            text-base 
            py-6 
            w-[200px] 
            h-[50px] 
            relative
            rounded-none
            ${isGalleryPage ? 'border-b-2 border-gray-800 font-bold' : ''}
          `}
          icon={FiList}
        >
          Assistant Gallery
        </Button>
      </div>
    </div>
  );
}