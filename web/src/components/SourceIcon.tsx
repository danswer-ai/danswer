"use client";

import { getSourceMetadata } from "@/lib/sources";
import { ValidSources } from "@/lib/types";

export function SourceIcon({
  sourceType,
  iconSize,
}: {
  sourceType: ValidSources;
  iconSize: number;
}) {
  return getSourceMetadata(sourceType).icon({
    size: iconSize,
  });
}
