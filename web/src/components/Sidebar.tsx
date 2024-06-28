import { useEffect, useRef } from "react";
import { FiX } from "react-icons/fi";

interface SidebarProps {
  onToggle?: () => void;
  isOpen: boolean;
  children: React.ReactNode;
  width?: string;
  wideWidth?: string;
  padded?: boolean;
  hideonDesktop?: boolean;
}

export default function Sidebar({
  onToggle,
  isOpen,
  children,
  width = "w-64",
  wideWidth = "3xl:w-72",
  padded,
  hideonDesktop,
}: SidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        onToggle
      ) {
        onToggle();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onToggle]);

  const sidebarClasses = `
      ${hideonDesktop && "desktop:hidden"}
      ${width} ${wideWidth}

      mobile:fixed mobile:top-0 mobile:left-0 mobile:z-[100]   ${padded && "desktop:pt-16"} ${isOpen ? "mobile:translate-x-0" : "mobile:-translate-x-full"} mobile:shadow-lg
      desktop:translate-x-0
      flex flex-none
      bg-background-weak
      border-r border-border
      flex flex-col
      h-screen
      transition-transform duration-300 ease-in-out
  `;

  return (
    <>
      <div className="desktop:hidden">
        {isOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-[100]"
            aria-hidden="true"
          />
        )}
      </div>

      <div className={sidebarClasses} id="sidebar" ref={sidebarRef}>
        {children}
        <div className="desktop:hidden">
          {onToggle && (
            <button
              onClick={onToggle}
              className="absolute top-4 right-4 text-strong"
              aria-label="Close sidebar"
            >
              <FiX size={24} />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
