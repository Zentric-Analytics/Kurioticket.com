"use client";

import { useEffect, useRef, useState } from "react";
import { getDealsGuidedNextExpiryAt, type DealsTripPlan } from "@/lib/deals/dealsTripPlan";
import { isDealsStagedLifecycleStorageKey, type DealsLifecycleSource } from "@/lib/deals/dealsGuidedJourneyLifecycle";
import { classifyDealsStagedJourneySnapshot, readDealsStagedJourneyPlan, type DealsStagedSnapshotResult, type DealsTripPlanReadResult } from "@/lib/deals/dealsTripPlanStorage";

export function useDealsStagedJourneyLifecycle({ fingerprint, plan, active = true, onSnapshot, onRefresh, onDeadline }: {
  fingerprint: string; plan: DealsTripPlan | null; active?: boolean;
  onSnapshot: (result: DealsStagedSnapshotResult, observedAt: number, source: DealsLifecycleSource) => void;
  onRefresh: (result: DealsTripPlanReadResult, observedAt: number, source: DealsLifecycleSource) => void;
  onDeadline?: (observedAt: number, source: "deadline") => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const snapshotRef = useRef(onSnapshot); const refreshRef = useRef(onRefresh); const deadlineRef = useRef(onDeadline);
  useEffect(() => { snapshotRef.current = onSnapshot; refreshRef.current = onRefresh; deadlineRef.current = onDeadline; }, [onDeadline, onRefresh, onSnapshot]);
  useEffect(() => {
    if (!active) return;
    const refresh = (source: "focus" | "visibility") => { const observedAt = Date.now(); setNow(observedAt); refreshRef.current(readDealsStagedJourneyPlan(fingerprint, observedAt), observedAt, source); };
    const storage = (event: StorageEvent) => {
      if (!isDealsStagedLifecycleStorageKey(event.key)) return;
      const observedAt = Date.now(); setNow(observedAt);
      snapshotRef.current(classifyDealsStagedJourneySnapshot(event.newValue, fingerprint, observedAt), observedAt, "storage");
    };
    const focus = () => refresh("focus");
    const visibility = () => { if (document.visibilityState === "visible") refresh("visibility"); };
    window.addEventListener("storage", storage); window.addEventListener("focus", focus); document.addEventListener("visibilitychange", visibility);
    const scheduledAt = Date.now(); const deadline = plan ? getDealsGuidedNextExpiryAt(plan, scheduledAt) : null;
    const timer = deadline === null ? null : window.setTimeout(() => { const observedAt = Date.now(); setNow(observedAt); deadlineRef.current?.(observedAt, "deadline"); }, deadline - scheduledAt);
    return () => {
      window.removeEventListener("storage", storage); window.removeEventListener("focus", focus); document.removeEventListener("visibilitychange", visibility);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [active, fingerprint, plan]);
  return now;
}
