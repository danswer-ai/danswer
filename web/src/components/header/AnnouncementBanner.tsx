"use client";
import { useState, useEffect } from "react";
import { XIcon } from "../icons/icons";
import { CustomTooltip } from "../tooltip/CustomTooltip";

interface AnnouncementProps {
  message: string;
  id: string;
}

export function AnnouncementBanner({ message, id }: AnnouncementProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(`announced_${id}_dismissed`);
    if (!dismissed) {
      setIsVisible(true);
    }
  }, [id]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(`announced_${id}_dismissed`, "true");
  };

  if (!isVisible) return null;

  return (
    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-blue-600 rounded-sm text-white px-4 pr-8 py-3 mx-auto">
      <p className="text-center">
        {message} <a className="underline cursor-pointer">Learn more</a>
      </p>
      <button
        onClick={handleDismiss}
        className="absolute top-0 right-0 mt-2 mr-2"
        aria-label="Dismiss"
      >
        <CustomTooltip showTick citation delay={100} content="Dismiss">
          <XIcon className="h-5 w-5" />
        </CustomTooltip>
      </button>
    </div>
  );
}
