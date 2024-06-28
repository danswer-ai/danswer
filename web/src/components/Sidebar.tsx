import { useContext, useEffect, useRef } from "react";
import { FiX } from "react-icons/fi";
import { SettingsContext } from "@/components/settings/SettingsProvider";

interface SidebarProps {
  onToggle?: () => void;
  isOpen: boolean;
  children: React.ReactNode;
  width?: string;
  wideWidth?: string;
  padded?: boolean;
}

export default function Sidebar({
  onToggle,
  isOpen,
  children,
  width = "w-64",
  wideWidth = "3xl:w-72",
  padded,
}: SidebarProps) {
  const combinedSettings = useContext(SettingsContext);
  const sidebarRef = useRef<HTMLDivElement>(null);

  if (!combinedSettings) {
    return null;
  }
  const isMobile = combinedSettings.isMobile;

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
    ${width} ${wideWidth}
    ${
      isMobile
        ? `fixed top-0 left-0 z-40 ${padded && "mt-16 pt-4"} ${isOpen ? "translate-x-0" : "-translate-x-full"} shadow-lg`
        : "translate-x-0"
    }
    flex flex-none
    bg-background-weak
    border-r border-border
    flex flex-col
    h-screen
    transition-transform duration-300 ease-in-out
  `;

  return (
    <>
      {isOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          aria-hidden="true"
        />
      )}
      <div className={sidebarClasses} id="sidebar" ref={sidebarRef}>
        {children}
        {isMobile && onToggle && (
          <button
            onClick={onToggle}
            className="absolute top-4 right-4 text-strong"
            aria-label="Close sidebar"
          >
            <FiX size={24} />
          </button>
        )}
      </div>
    </>
  );
}
