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
  const contextValue: CombinedSettings = {
    ...settings,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}
