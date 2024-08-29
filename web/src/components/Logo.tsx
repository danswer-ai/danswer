"use client";

import { useContext } from "react";
import { SettingsContext } from "./settings/SettingsProvider";
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

  height = height || 40;
  width = width || 40;

  if (
    !settings ||
    !settings.enterpriseSettings ||
    !settings.enterpriseSettings.use_custom_logo
  ) {
    return (
      <div style={{ height, width }} className={className}>
        <Image
          src="/logo.png"
          alt="Logo"
          width={width}
          height={height}
          className="object-contain rounded-regular"
        />
      </div>
    );
  }

  return (
    <div style={{ height, width }} className={`relative ${className}`}>
      <Image
        src="/api/enterprise-settings/logo"
        alt="Logo"
        className="object-contain rounded-regular"
        width={width}
        height={height}
      />
    </div>
  );
}
