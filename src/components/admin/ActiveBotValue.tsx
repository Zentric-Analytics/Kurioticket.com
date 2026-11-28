"use client";

import { useEffect, useState } from "react";
import { onlinePresenceHeartbeatMs, onlinePresenceWindowSeconds } from "@/lib/onlinePresence";

const numberFormat = new Intl.NumberFormat("en-US");

export function ActiveBotValue() {
  const [total, setTotal] = useState<number | "unavailable" | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    let activeRequest: AbortController | undefined;
    let nextRefreshAt = performance.now();

    function pause() {
      window.clearTimeout(timer);
      activeRequest?.abort();
      activeRequest = undefined;
    }

    function schedule() {
      window.clearTimeout(timer);
      if (document.visibilityState === "visible") {
        timer = window.setTimeout(refresh, Math.max(0, nextRefreshAt - performance.now()));
      }
    }

    async function refresh() {
      if (document.visibilityState !== "visible" || activeRequest) return;
      const controller = new AbortController();
      activeRequest = controller;
      nextRefreshAt = performance.now() + onlinePresenceHeartbeatMs;
      const timeout = window.setTimeout(() => controller.abort(), 8_000);
      try {
        const response = await fetch("/api/admin/overview/active-bot", {
          cache: "no-store",
          credentials: "same-origin",
          referrerPolicy: "origin",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Active bot refresh failed");
        const snapshot = await response.json() as { status?: unknown; total?: unknown; windowSeconds?: unknown };
        if (snapshot.status !== "ok" || snapshot.windowSeconds !== onlinePresenceWindowSeconds
          || typeof snapshot.total !== "number" || !Number.isSafeInteger(snapshot.total) || snapshot.total < 0) {
          throw new Error("Invalid active bot snapshot");
        }
        if (activeRequest === controller) setTotal(snapshot.total);
      } catch {
        if (activeRequest === controller) setTotal("unavailable");
      } finally {
        window.clearTimeout(timeout);
        if (activeRequest === controller) {
          activeRequest = undefined;
          schedule();
        }
      }
    }

    function onVisibilityChange() {
      pause();
      if (document.visibilityState === "visible") {
        nextRefreshAt = performance.now();
        schedule();
      }
    }

    schedule();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      pause();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return total === null ? "—" : total === "unavailable" ? "Unavailable" : numberFormat.format(total);
}
