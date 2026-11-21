"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refresh session validity and per-device presence while this history is open.
 * Hidden tabs do no polling; returning to a visible tab refreshes immediately.
 * The server continues to authorize and validate every observation. */
export function AdminDeviceHistoryAutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const refreshVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = window.setInterval(refreshVisible, 30_000);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [router]);
  return null;
}
