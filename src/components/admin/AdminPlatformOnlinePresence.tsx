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
const platformCards: PresenceCard[] = [
  { label: "Online total", key: "total", icon: UsersRound },
  { label: "iOS online", key: "ios", icon: Smartphone },
  { label: "Android online", key: "android", icon: TabletSmartphone },
  { label: "Mobile web online", key: "mobile_web", icon: Wifi },
  { label: "Desktop web online", key: "desktop_web", icon: Monitor },
];
const usersCards: PresenceCard[] = [
  { label: "Total online users", key: "total", icon: UsersRound },
  { label: "iOS online", key: "ios", icon: Smartphone },
  { label: "Android online", key: "android", icon: TabletSmartphone },
  { label: "Website online", key: "website", icon: Monitor },
];

function visibleValue(snapshot: OnlinePresenceSnapshot, key: PresenceCard["key"]) {
  if (snapshot.status === "not_configured") return "Not configured";
  if (!hasVerifiedPlatformCounts(snapshot) || snapshot.status !== "ok" || !snapshot.platforms)
    return "Unavailable";
  return number.format(key === "total" ? snapshot.total : snapshot.platforms[key]);
}

export function AdminPlatformOnlinePresence({ initial, variant = "platforms" }: {
  initial: OnlinePresenceSnapshot;
  variant?: "platforms" | "users";
}) {
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

  const onUsersPage = variant === "users";
  const cards = onUsersPage ? usersCards : platformCards;
  return <section aria-label={onUsersPage ? "Online Users" : "Online presence by platform"}
    className="min-w-0 space-y-2">
    <div className="flex flex-wrap items-end justify-between gap-2">
      <h2 className="text-[15px] font-semibold text-[#0F172A]">Online Users</h2>
      <span className="text-[11px] tabular-nums text-[#64748B]">
        Live · last {snapshot.windowSeconds} seconds
      </span>
    </div>
    <div data-testid={onUsersPage ? "users-online-metrics" : "online-platform-metrics"}
      className={onUsersPage
        ? "grid min-w-0 grid-cols-2 gap-3 min-[1024px]:grid-cols-4"
        : "grid min-w-0 grid-cols-2 gap-3 min-[640px]:grid-cols-3 min-[1024px]:grid-cols-5"}>
      {cards.map(({ label, key, icon: Icon }) => <div key={key} data-testid="online-platform-metric" className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/75 px-3.5 py-3">
        <div className="flex min-h-8 items-start gap-2 text-[12px] leading-4 text-[#64748B]">
          <Icon size={15} aria-hidden="true" className="mt-0.5 shrink-0" />{label}
        </div>
        <p className="mt-1 break-words text-[20px] font-semibold leading-7 tabular-nums text-[#0F172A]">
          {visibleValue(snapshot, key)}
        </p>
      </div>)}
    </div>
    <p className="text-[11px] leading-[17px] text-[#64748B]">
      {onUsersPage
        ? "Online counts ignore date filters. Each signed-in account counts once overall, even across devices. Guests count by session. Website includes desktop and mobile browsers."
        : "Online activity is estimated from recent visits, not logins or downloads. Accounts can appear on multiple platforms; anonymous sessions are counted separately. Unclassified activity appears in the overall total."}
    </p>
  </section>;
}
