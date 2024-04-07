"use client";

import { useContext } from "react";
import { SettingsContext } from "./settings/SettingsProviderClientSideHelper";
import Image from "next/image";

export function Logo({
  height,
  width,
  className,
}: {
  height?: number;
  width?: number;
  className?: string;
}) {
  const settings = useContext(SettingsContext);

  height = height || 32;
  width = width || 30;

  if (
    !settings ||
    !settings.enterpriseSettings ||
    !settings.enterpriseSettings.use_custom_logo
  ) {
    return (
      <div style={{ height, width }} className={className}>
        <Image src="/logo.png" alt="Logo" width={width} height={height} />
      </div>
    );
  }

  return (
    <div style={{ height, width }} className={`relative ${className}`}>
      <Image
        src="/api/enterprise-settings/logo"
        alt="Logo"
        fill
        style={{ objectFit: "contain" }}
      />
    </div>
  );
}
