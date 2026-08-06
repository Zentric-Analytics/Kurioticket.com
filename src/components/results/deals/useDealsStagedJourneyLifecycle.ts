"use client";

import { useEffect, useRef, useState } from "react";
import { getDealsGuidedNextExpiryAt, type DealsTripPlan } from "@/lib/deals/dealsTripPlan";
import { classifyDealsStagedJourneySnapshot, DEALS_STAGED_JOURNEY_STORAGE_KEY, readDealsStagedJourneyPlan, type DealsStagedSnapshotResult, type DealsTripPlanReadResult } from "@/lib/deals/dealsTripPlanStorage";

export function useDealsStagedJourneyLifecycle({ fingerprint, plan, active = true, onSnapshot, onRefresh }: {
  fingerprint: string; plan: DealsTripPlan | null; active?: boolean;
  onSnapshot: (result: DealsStagedSnapshotResult, observedAt: number) => void;
  onRefresh: (result: DealsTripPlanReadResult, observedAt: number) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const snapshotRef = useRef(onSnapshot); const refreshRef = useRef(onRefresh);
  useEffect(() => { snapshotRef.current = onSnapshot; refreshRef.current = onRefresh; }, [onRefresh, onSnapshot]);
  useEffect(() => {
    if (!active) return;
    const refresh = () => { const observedAt = Date.now(); setNow(observedAt); refreshRef.current(readDealsStagedJourneyPlan(fingerprint, observedAt), observedAt); };
    const storage = (event: StorageEvent) => {
      if (event.key !== DEALS_STAGED_JOURNEY_STORAGE_KEY) return;
      const observedAt = Date.now(); setNow(observedAt);
      snapshotRef.current(classifyDealsStagedJourneySnapshot(event.newValue, fingerprint, observedAt), observedAt);
    };
    const visibility = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("storage", storage); window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", visibility);
    const deadline = plan ? getDealsGuidedNextExpiryAt(plan) : null;
    const timer = deadline === null ? null : window.setTimeout(refresh, Math.max(0, deadline - Date.now()));
    return () => {
      window.removeEventListener("storage", storage); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", visibility);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [active, fingerprint, plan]);
  return now;
}
