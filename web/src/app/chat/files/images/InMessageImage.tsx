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

      <div className="relative w-full h-full max-w-96 max-h-96">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg" />
        )}
        <Image
          width={1200}
          height={1200}
          alt="Chat Message Image"
          onLoad={(event) => {
            event.currentTarget.setAttribute("data-loaded", "true");
            setImageLoaded(true);
          }}
          className={`object-cover object-center overflow-hidden rounded-lg w-full h-full max-w-96 max-h-96 transition-opacity duration-300
             ${imageLoaded ? "opacity-100" : "opacity-0"}`}
          onClick={() => setFullImageShowing(true)}
          src={buildImgUrl(fileId)}
          loading="lazy"
        />
      </div>
    </>
  );
}
