import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";

interface UseSidebarVisibilityProps {
  toggledSidebar: boolean;
  sidebarElementRef: React.RefObject<HTMLElement>;
  showDocSidebar: boolean;
  setShowDocSidebar: Dispatch<SetStateAction<boolean>>;
  mobile?: boolean;
}

export const useSidebarVisibility = ({
  toggledSidebar,
  sidebarElementRef,
  setShowDocSidebar,
  showDocSidebar,
  mobile,
}: UseSidebarVisibilityProps) => {
  const xPosition = useRef(0);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const currentXPosition = event.clientX;
      xPosition.current = currentXPosition;

      const sidebarRect = sidebarElementRef.current?.getBoundingClientRect();

      if (sidebarRect && sidebarElementRef.current) {
        const isWithinSidebar =
          currentXPosition >= sidebarRect.left &&
          currentXPosition <= sidebarRect.right &&
          event.clientY >= sidebarRect.top &&
          event.clientY <= sidebarRect.bottom;
        const sidebarStyle = window.getComputedStyle(sidebarElementRef.current);
        const isVisible = sidebarStyle.opacity !== "0";
        if (isWithinSidebar && isVisible) {
          if (!mobile) {
            setShowDocSidebar(true);
          }
        }

        if (
          currentXPosition > 100 &&
          showDocSidebar &&
          !isWithinSidebar &&
          !toggledSidebar
        ) {
          setShowDocSidebar(false);
        } else if (currentXPosition < 100 && !showDocSidebar) {
          if (!mobile) {
            setShowDocSidebar(true);
          }
        }
      }
    };

    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [showDocSidebar, toggledSidebar, sidebarElementRef, mobile]);

  return { showDocSidebar };
};
