"use client";

import { useEffect, useState } from "react";
import { onlinePresenceHeartbeatMs, type OnlinePresenceSnapshot } from "@/lib/onlinePresence";

const numberFormat = new Intl.NumberFormat("en-US");

export function OnlineUsersValue({ initial }: { initial: OnlinePresenceSnapshot }) {
  const [live, setLive] = useState<OnlinePresenceSnapshot | "unavailable" | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    let activeRequest: AbortController | undefined;

    function pause() {
      window.clearTimeout(timer);
      activeRequest?.abort();
      activeRequest = undefined;
    }

    function schedule() {
      window.clearTimeout(timer);
      if (document.visibilityState === "visible") {
        timer = window.setTimeout(refresh, onlinePresenceHeartbeatMs);
      }
    }

    async function refresh() {
      if (document.visibilityState !== "visible" || activeRequest) return;
      const controller = new AbortController();
      activeRequest = controller;
      const timeout = window.setTimeout(() => controller.abort(), 8_000);
      try {
        const response = await fetch("/api/admin/overview/online-presence", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Presence refresh failed");
        const snapshot: OnlinePresenceSnapshot = await response.json();
        if (snapshot.status !== "not_configured"
            && (snapshot.status !== "ok" || !Number.isSafeInteger(snapshot.total) || snapshot.total < 0)) {
          throw new Error("Invalid presence snapshot");
        }
        if (activeRequest === controller) setLive(snapshot);
      } catch {
        if (activeRequest === controller) setLive("unavailable");
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
      if (document.visibilityState === "visible") schedule();
    }

    schedule();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      pause();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const snapshot = live ?? initial;
  if (snapshot === "unavailable" || snapshot.status === "unavailable") return "Unavailable";
  if (snapshot.status === "not_configured") return "Not configured";
  return numberFormat.format(snapshot.total);
}
