"use client";

import { FeatureFlags } from "@/app/admin/settings/interfaces";
import { useFeatureFlag } from "@/components/feature_flag/FeatureFlagContext";
import React from "react";

interface FeatureFlagWrapperProps {
  flag: keyof FeatureFlags;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const FeatureFlagWrapper: React.FC<FeatureFlagWrapperProps> = ({
  flag,
  children,
  fallback = null,
}) => {
  const isEnabled = useFeatureFlag(flag);
  console.log(isEnabled);
  return isEnabled ? <>{children}</> : <>{fallback}</>;
};
