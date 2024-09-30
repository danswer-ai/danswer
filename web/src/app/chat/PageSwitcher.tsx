"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";

const PageSwitcher: React.FC = () => {
  const pathname = usePathname();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.altKey || event.metaKey) && event.key === "ArrowRight") {
        event.preventDefault();
        window.location.href = "/search";
      } else if ((event.altKey || event.metaKey) && event.key === "ArrowLeft") {
        event.preventDefault();
        window.location.href = "/chat";
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [pathname]);

  return <div />;
};

export default PageSwitcher;
