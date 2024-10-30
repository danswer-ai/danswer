import { useState } from "react";
import { FullImageModal } from "./FullImageModal";
import { buildImgUrl } from "./utils";
import Image from "next/image";

export function InMessageImage({ fileId }: { fileId: string }) {
  const [fullImageShowing, setFullImageShowing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <>
      <FullImageModal
        fileId={fileId}
        open={fullImageShowing}
        onOpenChange={(open) => setFullImageShowing(open)}
      />

      <img
        alt={fileId}
        className={`
          max-w-lg 
          rounded-regular 
          bg-transparent 
          cursor-pointer 
          transition-opacity 
          duration-300 
          opacity-100`}
        onClick={() => setFullImageShowing(true)}
        src={buildImgUrl(fileId)}
        loading="lazy"
      />
    </>
  );
}
