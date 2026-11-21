"use client";

import { useEffect, useState } from "react";
import { Monitor, Smartphone, TabletSmartphone, UsersRound, Wifi } from "lucide-react";
import {
  hasVerifiedPlatformCounts, onlinePresenceHeartbeatMs, type OnlinePresencePlatformCounts,
  type OnlinePresenceSnapshot,
} from "@/lib/onlinePresence";

const number = new Intl.NumberFormat("en-US");
type PresenceKey = keyof OnlinePresencePlatformCounts;
type PresenceCard = { label: string; key: PresenceKey | "total"; icon: typeof Monitor };
const cards: PresenceCard[] = [
  { label: "Online total", key: "total", icon: UsersRound },
  { label: "iOS online", key: "ios", icon: Smartphone },
  { label: "Android online", key: "android", icon: TabletSmartphone },
  { label: "Mobile web online", key: "mobile_web", icon: Wifi },
  { label: "Desktop web online", key: "desktop_web", icon: Monitor },
];

function visibleValue(snapshot: OnlinePresenceSnapshot, key: PresenceCard["key"]) {
  if (snapshot.status === "not_configured") return "Not configured";
  if (!hasVerifiedPlatformCounts(snapshot) || snapshot.status !== "ok" || !snapshot.platforms)
    return "Unavailable";
  return number.format(key === "total" ? snapshot.total : snapshot.platforms[key]);
}

export function AdminPlatformOnlinePresence({ initial }: { initial: OnlinePresenceSnapshot }) {
  const [snapshot, setSnapshot] = useState<OnlinePresenceSnapshot>(initial);

  useEffect(() => setSnapshot(initial), [initial]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inFlight: AbortController | undefined;
    async function refresh() {
      if (document.visibilityState !== "visible" || inFlight) return;
      const controller = new AbortController();
      inFlight = controller;
      const timeout = setTimeout(() => controller.abort(), 8_000);
      try {
        const response = await fetch("/api/admin/overview/online-presence", {
          cache: "no-store", referrerPolicy: "origin", signal: controller.signal,
        });
        if (!response.ok) throw new Error("Online presence unavailable");
        const next = await response.json() as OnlinePresenceSnapshot;
        if (next.status !== "not_configured" && !hasVerifiedPlatformCounts(next)) {
          throw new Error("Invalid online presence breakdown");
        }
        if (inFlight === controller) setSnapshot(next);
      } catch {
        if (inFlight === controller) {
          setSnapshot({ status: "unavailable", windowSeconds: 90, observedAt: new Date().toISOString() });
        }
      } finally {
        clearTimeout(timeout);
        if (inFlight === controller) {
          inFlight = undefined;
          schedule();
        }
      }
    }
    function schedule() {
      clearTimeout(timer);
      if (document.visibilityState === "visible") timer = setTimeout(refresh, onlinePresenceHeartbeatMs);
    }
    function visibilityChanged() {
      if (document.visibilityState !== "visible") {
        clearTimeout(timer);
        inFlight?.abort();
      } else {
        // Refresh promptly after returning rather than reporting stale presence.
        clearTimeout(timer);
        timer = setTimeout(refresh, 0);
      }
    }
    schedule();
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => { clearTimeout(timer); inFlight?.abort(); document.removeEventListener("visibilitychange", visibilityChanged); };
  }, []);

  return <section aria-label="Online presence by platform" className="min-w-0 space-y-2">
    <div className="flex flex-wrap items-end justify-between gap-2">
      <h2 className="text-[15px] font-semibold text-[#0F172A]">Online Users by Platform</h2>
      <span className="text-[11px] tabular-nums text-[#64748B]">
        Live presence · {snapshot.windowSeconds}-second activity window
      </span>
    </div>
    <div data-testid="online-platform-metrics" className="grid min-w-0 grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#E2E8F0] md:grid-cols-3 min-[1250px]:grid-cols-5">
      {cards.map(({ label, key, icon: Icon }) => <div key={key} className="min-w-0 bg-white px-3.5 py-3">
        <div className="flex min-h-8 items-start gap-2 text-[12px] leading-4 text-[#64748B]">
          <Icon size={15} aria-hidden="true" className="mt-0.5 shrink-0" />{label}
        </div>
        <p className="mt-1 break-words text-[20px] font-semibold leading-7 tabular-nums text-[#0F172A]">
          {visibleValue(snapshot, key)}
        </p>
      </div>)}
    </div>
    <p className="text-[11px] leading-[17px] text-[#64748B]">
      Online is an active heartbeat estimate, not a login or installation count. Signed-in accounts are
      deduplicated within each platform; anonymous users are counted by active presence session.
      The same account can appear on multiple platforms, so the cards need not add up to the overall total.
      Unclassified platform observations, if present, are included in the overall total only.
    </p>
  </section>;
}
