"use client";
/* eslint-disable react/no-unescaped-entities */

import Link from "next/link";
import { Bell, CheckCircle2, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildAutomaticFlightPriceAlertPayload, buildCanonicalFlightPriceAlertQuery, matchingAutomaticFlightPriceAlert, selectAutomaticFlightBaseline, type MatchableFlightPriceAlert } from "@/lib/price-alerts/flightPriceAlerts";
import type { PublicFlightResult } from "@/lib/types";
import { cn } from "@/lib/utils";

type WebFlightAlert = MatchableFlightPriceAlert & { id: string; origin: string | null; destination: string; targetPrice: string | null; currency: string | null };
type Feedback = "active" | "paused" | "error-start" | "error-pause" | null;
const replaceAlert = (alerts: WebFlightAlert[], alert: WebFlightAlert) => [...alerts.filter((item) => item.id !== alert.id), alert];
export const FLIGHT_PRICE_ALERT_SNACKBAR_DURATION_MS = 3_600;

export function FlightPriceAlertControl({ query: queryInput, results }: { query: unknown; results: PublicFlightResult[] }) {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const parsedQuery = useMemo(() => buildCanonicalFlightPriceAlertQuery(queryInput), [queryInput]);
  const query = parsedQuery.success ? parsedQuery.data : null;
  const baseline = useMemo(() => query ? selectAutomaticFlightBaseline(results, query.currency) : null, [query, results]);
  const [alerts, setAlerts] = useState<WebFlightAlert[]>([]);
  const [knownQueryKey, setKnownQueryKey] = useState("");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [snackbarLeaving, setSnackbarLeaving] = useState(false);
  const pendingRef = useRef(false);
  const requestRef = useRef(0);
  const matchingAlert = useMemo(() => query ? matchingAutomaticFlightPriceAlert(alerts, query) : undefined, [alerts, query]);
  const tracking = matchingAlert?.status === "ACTIVE";
  const queryKey = query ? JSON.stringify(query) : "";
  const known = Boolean(queryKey) && knownQueryKey === queryKey;

  const reconcile = useCallback(async () => {
    if (!query) return;
    const request = ++requestRef.current;
    try {
      const response = await fetch("/api/price-alerts", { cache: "no-store" });
      if (request !== requestRef.current) return;
      if (response.status === 401) { setAlerts([]); return; }
      if (!response.ok) return;
      const body = await response.json() as { alerts?: WebFlightAlert[] };
      setAlerts(Array.isArray(body.alerts) ? body.alerts : []);
    } finally { if (request === requestRef.current) setKnownQueryKey(queryKey); }
  }, [query, queryKey]);

  useEffect(() => { void reconcile(); return () => { requestRef.current += 1; }; }, [reconcile]);
  useEffect(() => {
    if (!feedback) return;
    const leave = window.setTimeout(() => setSnackbarLeaving(true), FLIGHT_PRICE_ALERT_SNACKBAR_DURATION_MS - 180);
    const dismiss = window.setTimeout(() => setFeedback(null), FLIGHT_PRICE_ALERT_SNACKBAR_DURATION_MS);
    return () => { window.clearTimeout(leave); window.clearTimeout(dismiss); };
  }, [feedback]);

  if (!query || !baseline) return null;
  const signIn = () => router.push(`/auth/signin?callbackUrl=${encodeURIComponent(location.pathname + location.search)}`);
  const showFeedback = (next: Exclude<Feedback, null>) => { setSnackbarLeaving(false); setFeedback(next); };
  const patchStatus = async (alert: WebFlightAlert, status: "ACTIVE" | "PAUSED") => {
    const response = await fetch(`/api/price-alerts/${encodeURIComponent(alert.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (response.status === 401) { signIn(); return undefined; }
    if (!response.ok) return undefined;
    return ((await response.json()) as { alert: WebFlightAlert }).alert;
  };
  const toggle = async (next: boolean) => {
    if (!known || pendingRef.current || next === tracking) return;
    if (sessionStatus === "unauthenticated") { signIn(); return; }
    pendingRef.current = true; setPending(true); setFeedback(null);
    try {
      let saved: WebFlightAlert | undefined;
      if (!next) saved = matchingAlert ? await patchStatus(matchingAlert, "PAUSED") : undefined;
      else if (matchingAlert?.status === "PAUSED") saved = await patchStatus(matchingAlert, "ACTIVE");
      else {
        const payload = buildAutomaticFlightPriceAlertPayload({ origin: query.origin, destination: query.destination, baselinePrice: baseline.price, currency: baseline.currency, query });
        const response = await fetch("/api/price-alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (response.status === 401) { signIn(); return; }
        const body = await response.json().catch(() => ({})) as { alert?: WebFlightAlert };
        if (response.status === 409 && body.alert) {
          const canonical = matchingAutomaticFlightPriceAlert([body.alert], query);
          saved = canonical?.status === "PAUSED" ? await patchStatus(canonical, "ACTIVE") : canonical;
        } else if (response.ok) saved = body.alert;
      }
      if (!saved) { showFeedback(next ? "error-start" : "error-pause"); return; }
      setAlerts((current) => replaceAlert(current, saved!));
      showFeedback(next ? "active" : "paused");
    } catch { showFeedback(next ? "error-start" : "error-pause"); }
    finally { pendingRef.current = false; setPending(false); }
  };

  const disabled = pending || !known;
  return <>
    <section data-flight-price-alert aria-label="Flight price alert" className="sm:hidden"><div className="flex min-h-[52px] items-center gap-2 rounded-xl border border-[#CFE0F8] bg-[#EEF6FF] px-3"><Bell className="h-[17px] w-[17px] shrink-0 text-[#004BB8]" strokeWidth={2} aria-hidden="true" /><h2 className="min-w-0 flex-1 truncate text-[13px] font-bold leading-4 text-slate-950">Track this flight price</h2><span className="flex h-11 shrink-0 items-center gap-1.5"><span className="flex w-5 justify-center">{pending ? <LoaderCircle className="h-4 w-4 animate-spin text-[#004BB8] motion-reduce:animate-none" aria-hidden="true" /> : null}</span><span className="flex w-[51px] justify-end"><button type="button" role="switch" aria-label="Track this flight price" aria-checked={tracking} aria-busy={pending || !known} disabled={disabled} onClick={() => void toggle(!tracking)} className={cn("relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30 disabled:cursor-wait disabled:opacity-55", tracking ? "border-[#004BB8] bg-[#004BB8]" : "border-slate-300 bg-slate-200")}><span className={cn("inline-block h-6 w-6 rounded-full bg-white shadow-sm transition-transform", tracking ? "translate-x-5" : "translate-x-0.5")} /></button></span></span></div></section>
    {feedback ? <div role={feedback.startsWith("error") ? "alert" : "status"} aria-live="polite" className={cn("fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[110] mx-auto flex max-w-md items-center gap-2.5 rounded-[14px] border border-slate-200 bg-white px-3 py-2.5 shadow-[0_12px_34px_rgba(15,23,42,0.2)] transition duration-200", snackbarLeaving ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100")}><CheckCircle2 className={cn("h-5 w-5 shrink-0", feedback.startsWith("error") ? "text-rose-600" : "text-[#004BB8]")} aria-hidden="true" /><span className="min-w-0 flex-1"><strong className="block text-sm leading-5 text-slate-950">{feedback === "active" ? "Price tracking is on" : feedback === "paused" ? "Price tracking paused" : feedback === "error-start" ? "Couldn't start price tracking" : "Couldn't pause price tracking"}</strong>{feedback === "active" ? <span className="block text-xs leading-4 text-slate-600">We'll notify you if the price drops.</span> : null}</span>{feedback === "active" ? <Link href="/price-alerts" className="inline-flex min-h-11 shrink-0 items-center px-1 text-sm font-bold text-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35">Manage</Link> : null}</div> : null}
  </>;
}
