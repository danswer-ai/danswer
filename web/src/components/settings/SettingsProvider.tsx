"use client";

import { CombinedSettings } from "@/app/admin/settings/interfaces";
import { createContext, useEffect, useState } from "react";

export const SettingsContext = createContext<CombinedSettings | null>(null);

export function SettingsProvider({
  children,
  settings,
}: {
  children: React.ReactNode | JSX.Element;
  settings: CombinedSettings;
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    handleResize(); // Initial check
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const contextValue: CombinedSettings = {
    ...settings,
    isMobile,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}
