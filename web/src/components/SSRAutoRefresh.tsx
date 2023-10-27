"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function SSRAutoRefresh({ refreshFreq = 5 }: { refreshFreq?: number }) {
  // Helper which automatically refreshes a SSR page X seconds
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, refreshFreq * 1000);

    return () => clearInterval(interval);
  });

  return <></>
}
