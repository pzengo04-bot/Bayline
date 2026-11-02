"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-renders the page every `seconds` while it's on screen, so Recent activity stays current. */
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
