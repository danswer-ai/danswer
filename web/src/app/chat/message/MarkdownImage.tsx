import { useState } from "react";


const ImagePopup = ({ src, alt, onClose }: { src?:any, alt?:any, onClose?: any }) => {
    
    return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
        <div className="relative max-w-3xl max-h-[80vh]">
          <img
            src={src}
            alt={alt}
            className="w-auto h-auto max-w-full max-h-full object-contain"
          />
          <button
            onClick={onClose}
            className="absolute top-10 right-2 text-white text-2xl bg-black bg-opacity-50 rounded-full py-1 px-2 leading-6"
          >
            &times;
          </button>
        </div>
    </div>
  
    );
  };

const MarkdownImage = ({ src, alt }:{src?:any, alt?:any}) => {
    const [isPopupOpen, setIsPopupOpen] = useState(false);
  
    const handleImageClick = () => {
      setIsPopupOpen(true);
    };
  
    const handleClosePopup = () => {
      setIsPopupOpen(false);
    };
  
    return (
      <>
        <img
          src={src}
          alt={alt}
          className="w-full max-w-md cursor-pointer"
          onClick={handleImageClick}
        />
        {isPopupOpen && (
          <ImagePopup
            src={src}
            alt={alt}
            onClose={handleClosePopup}
          />
        )}
      </>
    );
  };
  
export default MarkdownImage;