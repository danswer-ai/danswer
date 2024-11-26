"use client";

import { FeatureFlags } from "@/app/admin/settings/interfaces";
import { createContext, useContext } from "react";

const FeatureFlagContext = createContext<FeatureFlags | null>(null);

export const FeatureFlagProvider = ({
  flags,
  children,
}: {
  flags: FeatureFlags;
  children: React.ReactNode | JSX.Element;
}) => {
  return (
    <FeatureFlagContext.Provider value={flags}>
      {children}
    </FeatureFlagContext.Provider>
  );
};

export const useFeatureFlag = (flag: keyof FeatureFlags) => {
  const flags = useContext(FeatureFlagContext);
  return flags ? flags[flag] : null;
};
