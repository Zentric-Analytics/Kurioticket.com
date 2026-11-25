"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, RefreshCw } from "lucide-react";
import { formatPlatformRefreshTime, parsePlatformRefreshSnapshot } from "@/lib/platformHealthRefresh";
import type { PlatformOperations } from "./PlatformHealthDashboard";

type Feedback = "idle" | "success" | "error";

export function PlatformHealthRefresh({ hours, period = "rolling", timeZone = "UTC", lastRefreshedAt, onRefreshed }: {
  hours: number;
  period?: "today" | "rolling";
  timeZone?: string;
  lastRefreshedAt: string;
  onRefreshed: (fresh: PlatformOperations) => void;
}) {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>("idle");
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);

  // Leaving the page must not apply stale observations to a different view.
  useEffect(() => () => controllerRef.current?.abort(), []);

  async function refresh() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setFeedback("idle");
    setError("");
    const controller = new AbortController();
    controllerRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch("/api/admin/platform-operations?hours=" + hours + (period === "today" ? "&period=today" : ""), {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
      });
      if (response.status === 401) throw new Error("Your session has expired. Sign in again to refresh.");
      if (response.status === 403) throw new Error("Your session cannot access these observations.");
      if (!response.ok) throw new Error("The monitoring service could not refresh. Please try again.");
      const fresh = parsePlatformRefreshSnapshot(await response.json(), hours, period, timeZone);
      if (!fresh) throw new Error("The monitoring response was incomplete. Please try again.");
      if (controller.signal.aborted) return;
      onRefreshed(fresh);
      setFeedback("success");
    } catch (caught) {
      const message = controller.signal.aborted
        ? "Refreshing took too long. Check your connection and try again."
        : caught instanceof Error && !(caught instanceof TypeError)
          ? caught.message
          : "Unable to reach monitoring. Check your connection and try again.";
      setFeedback("error");
      setError(message);
    } finally {
      window.clearTimeout(timeout);
      if (controllerRef.current === controller) controllerRef.current = null;
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col items-start gap-1.5 sm:w-auto sm:items-end">
      <button type="button" aria-busy={pending} disabled={pending} onClick={refresh}
        className="focus-ring inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#D8E1EC] bg-white px-4 text-[13px] font-medium text-[#004BB8] transition-colors hover:border-[#B7C8DF] hover:bg-[#F4F7FB] focus-visible:ring-2 focus-visible:ring-[#004BB8]/20 disabled:cursor-wait disabled:opacity-65">
        <RefreshCw size={14} aria-hidden="true" className={pending ? "motion-safe:animate-spin" : ""} />
        <span>{pending ? "Refreshing…" : "Refresh observations"}</span>
      </button>
      <p role="status" aria-live="polite" aria-atomic="true"
        className="flex min-h-4 max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-4 text-[#64748B]">
        <span>Last refreshed: <time dateTime={lastRefreshedAt} className="font-medium tabular-nums text-[#475569]">{formatPlatformRefreshTime(lastRefreshedAt, timeZone)}</time></span>
        {pending ? <span>· Checking observations…</span>
          : feedback === "success" ? <span className="inline-flex items-center gap-1 font-medium text-emerald-700"><Check size={12} aria-hidden="true" /> Updated</span> : null}
      </p>
      {feedback === "error" ? <p role="alert" className="flex max-w-[310px] items-start gap-1.5 text-[11px] leading-4 text-rose-700">
        <AlertCircle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>{error}</span>
      </p> : null}
    </div>
  );
}
