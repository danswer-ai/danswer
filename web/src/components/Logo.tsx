"use client";

import { useContext } from "react";
import { SettingsContext } from "./settings/SettingsProvider";
import Image from "next/image";
import { buildImgUrl } from "@/app/chat/files/images/utils";

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
    !settings.workspaces ||
    !settings.workspaces.use_custom_logo ||
    !settings.workspaces.custom_logo
  ) {
    return (
      <div style={{ height, width }} className={className}>
        <Image
          src="/arnold_ai.png"
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
      <img
        src={buildImgUrl(settings.workspaces?.custom_logo)}
        alt="Logo"
        style={{ objectFit: "cover", height, width, borderRadius: "8px" }}
        width={width}
        height={height}
      />
    </div>
  );
}
