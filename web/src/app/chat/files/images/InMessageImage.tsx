import { useState } from "react";
import { FullImageModal } from "./FullImageModal";
import { buildImgUrl } from "./utils";

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
        <div
          className={`absolute inset-0 bg-gray-200 rounded-lg transition-opacity duration-300 ${
            imageLoaded ? "opacity-0" : "opacity-100"
          }`}
        />
        <img
          width={1200}
          height={1200}
          alt="Chat Message Image"
          onLoad={() => setImageLoaded(true)}
          className={`object-cover object-center overflow-hidden rounded-lg w-full h-full max-w-96 max-h-96 transition-opacity duration-300`}
          onClick={() => setFullImageShowing(true)}
          src={buildImgUrl(fileId)}
          loading="lazy"
        />
      </div>
    </>
  );
}
