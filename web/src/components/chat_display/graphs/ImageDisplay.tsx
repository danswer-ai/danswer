import { buildImgUrl } from "@/app/chat/files/images/utils";
import React, { useState, useEffect } from "react";

export function ImageDisplay({ fileId }: { fileId: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fullImageShowing, setFullImageShowing] = useState(false);

  // useEffect(() => {
  //     fetchImageUrl(fileId);
  // }, [fileId]);

  // const fetchImageUrl = async (id: string) => {
  //     try {
  //         const response = await fetch(`api/chat/file/${id}`);
  //         if (!response.ok) {
  //             throw new Error('Failed to fetch image data');
  //         }
  //         const data = await response.json();
  //         setImageUrl(data.imageUrl); // Assuming the API returns an object with an imageUrl field
  //     } catch (error) {
  //         console.error("Error fetching image data:", error);
  //     }
  // };

  // const buildImgUrl = (id: string) => {
  //     // Implement your URL building logic here
  //     return imageUrl || ''; // Return the fetched URL or an empty string if not available
  // };

  return (
    // <div className="w-full h-full">
    <>
      <img
        className="w-full mx-auto object-cover object-center overflow-hidden rounded-lg w-full h-full transition-opacity duration-300 opacity-100"
        onClick={() => setFullImageShowing(true)}
        src={buildImgUrl(fileId)}
        alt="Fetched image"
        loading="lazy"
      />
      {fullImageShowing && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setFullImageShowing(false)}
        >
          <img
            src={buildImgUrl(fileId)}
            alt="Full size image"
            className="max-w-90vw max-h-90vh object-contain"
          />
        </div>
      )}
    </>

    // </div>
  );
}
