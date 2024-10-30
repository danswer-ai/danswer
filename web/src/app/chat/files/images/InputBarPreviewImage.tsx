"use client";

import { useState } from "react";
import { buildImgUrl } from "./utils";
import { FullImageModal } from "./FullImageModal";
import Image from "next/image";

export function InputBarPreviewImage({ fileId }: { fileId: string }) {
  const [fullImageShowing, setFullImageShowing] = useState(false);

  return (
    <>
      <FullImageModal
        fileId={fileId}
        open={fullImageShowing}
        onOpenChange={(open) => setFullImageShowing(open)}
      />
      <div
        className={`
          bg-transparent
          border-none
          flex
          items-center
          p-2
          bg-hover
          border
          border-border
          rounded-md
          box-border
          h-10
      `}
      >
        <img
          alt="preview image input"
          onClick={() => setFullImageShowing(true)}
          className="h-16 w-16 object-cover rounded-regular bg-background cursor-pointer"
          src={buildImgUrl(fileId)}
        />
      </div>
    </>
  );
}
