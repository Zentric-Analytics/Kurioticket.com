"use client";

import { createPortal } from "react-dom";
import { Bell, CheckCircle2, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { formatCurrency } from "@/lib/currency/formatCurrency";
import {
  buildCanonicalFlightPriceAlertQuery,
  buildFlightPriceAlertPayload,
  FLIGHT_ALERT_DEFAULT_DROP_PERCENT,
  FLIGHT_ALERT_MAX_DROP_PERCENT,
  FLIGHT_ALERT_MIN_DROP_PERCENT,
  flightAlertDesiredPrice,
  flightAlertDropPercentForTarget,
  matchingFlightPriceAlertForControl,
  matchingTargetFlightPriceAlert,
  selectAutomaticFlightBaseline,
  targetFlightPriceAlertMatchesQuery,
  type MatchableFlightPriceAlert,
} from "@/lib/price-alerts/flightPriceAlerts";
import type { PublicFlightResult } from "@/lib/types";
import { cn } from "@/lib/utils";

type WebFlightAlert = MatchableFlightPriceAlert & {
  id: string;
  origin: string | null;
  destination: string;
  targetPrice: string | null;
  currency: string | null;
};
type Feedback = "saved" | "paused" | "error-save" | "error-pause" | null;
type Surface = "mobile" | "desktop";

const replaceAlert = (alerts: WebFlightAlert[], alert: WebFlightAlert) => [
  ...alerts.filter((item) => item.id !== alert.id),
  alert,
];
export const FLIGHT_PRICE_ALERT_SNACKBAR_DURATION_MS = 3_600;

export function FlightPriceAlertControl({ query: queryInput, results }: { query: unknown; results: PublicFlightResult[] }) {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const parsedQuery = useMemo(() => buildCanonicalFlightPriceAlertQuery(queryInput), [queryInput]);
  const searchQuery = parsedQuery.success ? parsedQuery.data : null;
  const baseline = useMemo(
    () => searchQuery ? selectAutomaticFlightBaseline(results, searchQuery.currency) : null,
    [results, searchQuery],
  );
  const alertQuery = useMemo(() => {
    if (!searchQuery || !baseline) return null;
    const parsed = buildCanonicalFlightPriceAlertQuery({ ...searchQuery, currency: baseline.currency });
    return parsed.success ? parsed.data : null;
  }, [baseline, searchQuery]);
  const queryKey = alertQuery ? JSON.stringify(alertQuery) : "";

  const [alerts, setAlerts] = useState<WebFlightAlert[]>([]);
  const [knownQueryKey, setKnownQueryKey] = useState("");
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [openSurface, setOpenSurface] = useState<Surface | null>(null);
  const [dropPercent, setDropPercent] = useState(FLIGHT_ALERT_DEFAULT_DROP_PERCENT);
  const [preservedPausedTarget, setPreservedPausedTarget] = useState<{ id: string; target: number } | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [snackbarLeaving, setSnackbarLeaving] = useState(false);
  const pendingRef = useRef(false);
  const requestRef = useRef(0);
  const mutationRef = useRef(0);
  const mobileSwitchRef = useRef<HTMLButtonElement>(null);
  const desktopSwitchRef = useRef<HTMLButtonElement>(null);
  const desktopDialogRef = useRef<HTMLDialogElement>(null);

  const targetAlert = useMemo(
    () => alertQuery ? matchingTargetFlightPriceAlert(alerts, alertQuery) : undefined,
    [alertQuery, alerts],
  );
  const matchingAlert = useMemo(
    () => alertQuery ? matchingFlightPriceAlertForControl(alerts, alertQuery) : undefined,
    [alertQuery, alerts],
  );
  const activeAlert = matchingAlert?.status === "ACTIVE" ? matchingAlert : undefined;
  const tracking = Boolean(activeAlert);
  const known = Boolean(queryKey) && knownQueryKey === queryKey;

  const reconcile = useCallback(async () => {
    if (!alertQuery) return;
    const request = ++requestRef.current;
    try {
      const response = await fetch("/api/price-alerts", { cache: "no-store" });
      if (request !== requestRef.current) return;
      if (response.status === 401) { setAlerts([]); setAuthenticated(false); return; }
      if (!response.ok) return;
      const body = await response.json() as { alerts?: WebFlightAlert[] };
      setAlerts(Array.isArray(body.alerts) ? body.alerts : []);
      setAuthenticated(true);
    } finally {
      if (request === requestRef.current) setKnownQueryKey(queryKey);
    }
  }, [alertQuery, queryKey]);

  useEffect(() => {
    const reset = window.setTimeout(() => {
      pendingRef.current = false;
      setPending(false);
      setAuthenticated(null);
      setOpenSurface(null);
      setPreservedPausedTarget(null);
      setFeedback(null);
    }, 0);
    void reconcile();
    return () => {
      window.clearTimeout(reset);
      requestRef.current += 1;
      mutationRef.current += 1;
    };
  }, [reconcile]);

  useEffect(() => {
    if (!feedback) return;
    const leave = window.setTimeout(() => setSnackbarLeaving(true), FLIGHT_PRICE_ALERT_SNACKBAR_DURATION_MS - 180);
    const dismiss = window.setTimeout(() => setFeedback(null), FLIGHT_PRICE_ALERT_SNACKBAR_DURATION_MS);
    return () => { window.clearTimeout(leave); window.clearTimeout(dismiss); };
  }, [feedback]);

  useEffect(() => {
    if (openSurface !== "mobile") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pendingRef.current) {
        setOpenSurface(null);
        window.setTimeout(() => mobileSwitchRef.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", dismiss);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", dismiss);
    };
  }, [openSurface]);

  useEffect(() => {
    if (openSurface !== "desktop") return;
    const dialog = desktopDialogRef.current;
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
      window.setTimeout(() => desktopSwitchRef.current?.focus({ preventScroll: true }), 0);
    };
  }, [openSurface]);

  if (!alertQuery || !baseline) return null;

  const signIn = () => router.push(`/auth/signin?callbackUrl=${encodeURIComponent(location.pathname + location.search)}`);
  const showFeedback = (next: Exclude<Feedback, null>) => { setSnackbarLeaving(false); setFeedback(next); };
  const closeEditor = (returnFocus = true) => {
    if (pendingRef.current) return;
    const surface = openSurface;
    setOpenSurface(null);
    setPreservedPausedTarget(null);
    setFeedback(null);
    if (returnFocus) window.setTimeout(() => (surface === "mobile" ? mobileSwitchRef : desktopSwitchRef).current?.focus(), 0);
  };
  const openEditor = (surface: Surface) => {
    if (!known || pendingRef.current) return;
    if (sessionStatus === "unauthenticated" || authenticated === false) { signIn(); return; }
    const pausedTarget = targetAlert?.status === "PAUSED"
      && targetAlert.currency?.toUpperCase() === baseline.currency.toUpperCase()
      ? Number(targetAlert.targetPrice)
      : Number.NaN;
    const usablePausedTarget = Number.isFinite(pausedTarget) && pausedTarget > 0 && pausedTarget < baseline.price;
    setPreservedPausedTarget(usablePausedTarget ? { id: targetAlert!.id, target: pausedTarget } : null);
    setDropPercent(usablePausedTarget
      ? flightAlertDropPercentForTarget(baseline.price, pausedTarget)
      : FLIGHT_ALERT_DEFAULT_DROP_PERCENT);
    setFeedback(null);
    setOpenSurface(surface);
  };
  const patchStatus = async (alert: WebFlightAlert, status: "ACTIVE" | "PAUSED") => {
    const response = await fetch(`/api/price-alerts/${encodeURIComponent(alert.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (response.status === 401) { signIn(); return undefined; }
    if (!response.ok) return undefined;
    return ((await response.json()) as { alert: WebFlightAlert }).alert;
  };

  const calculatedTarget = flightAlertDesiredPrice(baseline.price, dropPercent, baseline.currency);
  const alertTarget = preservedPausedTarget?.target ?? calculatedTarget;
  const dropAmount = alertTarget === null ? null : Math.max(0, baseline.price - alertTarget);

  const saveTarget = async () => {
    if (alertTarget === null || pendingRef.current) return;
    const mutation = ++mutationRef.current;
    pendingRef.current = true;
    setPending(true);
    setFeedback(null);
    try {
      let saved: WebFlightAlert | undefined;
      const pausedSameTarget = preservedPausedTarget
        ? alerts.find((alert) => alert.id === preservedPausedTarget.id
          && alert.status === "PAUSED"
          && targetFlightPriceAlertMatchesQuery(alert, alertQuery))
        : undefined;
      if (pausedSameTarget) {
        saved = await patchStatus(pausedSameTarget, "ACTIVE");
      } else {
        const payload = buildFlightPriceAlertPayload({
          origin: alertQuery.origin,
          destination: alertQuery.destination,
          targetPrice: alertTarget,
          currency: baseline.currency,
          query: alertQuery,
        });
        const response = await fetch("/api/price-alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (response.status === 401) { signIn(); return; }
        const body = await response.json().catch(() => ({})) as { alert?: WebFlightAlert };
        if (response.status === 409 && body.alert && targetFlightPriceAlertMatchesQuery(body.alert, alertQuery)) {
          saved = body.alert.status === "PAUSED" ? await patchStatus(body.alert, "ACTIVE") : body.alert;
        } else if (response.ok) {
          saved = body.alert;
        }
      }
      if (mutation !== mutationRef.current) return;
      if (!saved) { showFeedback("error-save"); return; }
      setAlerts((current) => replaceAlert(current, saved!));
      setOpenSurface(null);
      setPreservedPausedTarget(null);
      showFeedback("saved");
    } catch {
      if (mutation === mutationRef.current) showFeedback("error-save");
    } finally {
      if (mutation === mutationRef.current) { pendingRef.current = false; setPending(false); }
    }
  };

  const toggle = async (next: boolean, surface: Surface) => {
    if (!known || pendingRef.current || next === tracking) return;
    if (next) { openEditor(surface); return; }
    if (!activeAlert) return;
    const mutation = ++mutationRef.current;
    pendingRef.current = true;
    setPending(true);
    setFeedback(null);
    try {
      const saved = await patchStatus(activeAlert, "PAUSED");
      if (mutation !== mutationRef.current) return;
      if (!saved) { showFeedback("error-pause"); return; }
      setAlerts((current) => replaceAlert(current, saved));
      showFeedback("paused");
    } catch {
      if (mutation === mutationRef.current) showFeedback("error-pause");
    } finally {
      if (mutation === mutationRef.current) { pendingRef.current = false; setPending(false); }
    }
  };

  const formatPrice = (amount: number) => formatCurrency(amount, baseline.currency);
  const editor = (surface: Surface) => (
    <>
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2">
        <p className="text-xs font-medium leading-4 text-slate-500">Current price</p>
        <p className="mt-0.5 text-[21px] font-bold leading-[26px] text-slate-950 tabular-nums">{formatPrice(baseline.price)}</p>
      </div>
      <div>
        <div className="flex items-center justify-between gap-3"><span className="text-[15px] font-semibold text-slate-950">Price drop</span><strong className="text-[15px] text-[#004BB8]">{dropPercent}%</strong></div>
        <input type="range" min={FLIGHT_ALERT_MIN_DROP_PERCENT} max={FLIGHT_ALERT_MAX_DROP_PERCENT} step={1} value={dropPercent} aria-label="Price drop" aria-valuetext={`${dropPercent}%`} onChange={(event) => { setPreservedPausedTarget(null); setDropPercent(Number(event.target.value)); setFeedback(null); }} className="mt-2 h-2 w-full cursor-pointer accent-[#004BB8]" />
        <div className="mt-1 flex justify-between text-[11px] text-slate-500"><span>1%</span><span>50%</span></div>
      </div>
      <div className="grid min-h-[58px] grid-cols-2 gap-3 border-y border-slate-200 py-2">
        <div><p className="text-xs font-medium text-slate-500">Drops by</p><p className="mt-0.5 text-[15px] font-bold text-slate-950 tabular-nums">{dropAmount === null ? "—" : formatPrice(dropAmount)}</p></div>
        <div className="text-right"><p className="text-xs font-medium text-slate-500">Target price</p><p className="mt-0.5 text-[15px] font-bold text-slate-950 tabular-nums">{alertTarget === null ? "—" : formatPrice(alertTarget)}</p></div>
      </div>
      {feedback === "error-save" ? <p role="alert" aria-live="assertive" className="text-xs font-medium text-red-700">Couldn&apos;t save price alert. Please try again.</p> : null}
      <button type="button" disabled={pending || alertTarget === null} onClick={() => void saveTarget()} className="min-h-[46px] w-full rounded-[10px] bg-[#004BB8] px-4 text-[15px] font-bold text-white hover:bg-[#003B91] disabled:opacity-45">{pending ? "Saving…" : "Save price alert"}</button>
    </>
  );

  const switchButton = (surface: Surface) => (
    <button ref={surface === "mobile" ? mobileSwitchRef : desktopSwitchRef} type="button" role="switch" aria-label="Track this flight price" aria-checked={tracking} aria-busy={pending || !known} disabled={pending || !known} onClick={() => void toggle(!tracking, surface)} className={cn("relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30 disabled:cursor-wait disabled:opacity-55", tracking ? "border-[#004BB8] bg-[#004BB8]" : "border-slate-300 bg-slate-200")}>
      <span className={cn("inline-block h-6 w-6 rounded-full bg-white shadow-sm transition-transform", tracking ? "translate-x-5" : "translate-x-0.5")} />
    </button>
  );

  const mobileEditor = openSurface === "mobile" && typeof document !== "undefined" ? createPortal(
    <div className="fixed inset-0 z-[10030] flex items-end bg-slate-950/45 sm:hidden" role="presentation">
      <button type="button" aria-label="Close price alert" className="absolute inset-0" onClick={() => closeEditor()} />
      <section role="dialog" aria-modal="true" aria-label="Track this flight price" className="relative z-10 max-h-[92svh] w-full overflow-y-auto rounded-t-[22px] border border-b-0 border-slate-200 bg-white px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_36px_rgba(15,23,42,0.18)]">
        <header className="flex items-start gap-2.5"><div className="min-w-0 flex-1 pt-0.5"><h2 className="text-xl font-bold text-slate-950">Track this flight price</h2><p className="mt-0.5 text-[13px] leading-[19px] text-slate-600">Choose a target and we’ll notify you if the price drops.</p></div><button type="button" aria-label="Close price alert" disabled={pending} onClick={() => closeEditor()} className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 disabled:opacity-50"><X className="h-[21px] w-[21px]" aria-hidden="true" /></button></header>
        <div className="mt-3 grid gap-[13px]">{editor("mobile")}<button type="button" disabled={pending} onClick={() => closeEditor()} className="min-h-10 text-sm font-semibold text-slate-700">Cancel</button></div>
      </section>
    </div>, document.body) : null;

  const desktopEditor = openSurface === "desktop" && typeof document !== "undefined" ? createPortal(
    <dialog
      ref={desktopDialogRef}
      aria-modal="true"
      aria-label="Track this flight price"
      onCancel={(event) => {
        event.preventDefault();
        closeEditor();
      }}
      onMouseDown={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        ) {
          closeEditor();
        }
      }}
      className="fixed inset-0 m-auto w-[min(29rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 text-slate-950 shadow-2xl backdrop:bg-slate-950/50"
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Track this flight price</h2>
          <p className="mt-0.5 text-xs font-medium leading-4 text-slate-600">
            Choose a target and we’ll notify you if the price drops.
          </p>
        </div>
        <button
          type="button"
          aria-label="Close price alert"
          disabled={pending}
          onClick={() => closeEditor()}
          className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/40 disabled:cursor-default disabled:opacity-50"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>
      <div className="grid gap-[13px]">{editor("desktop")}</div>
    </dialog>,
    document.body,
  ) : null;

  return <>
    <section data-flight-price-alert className="block" aria-label="Flight price alert">
      <div className="flex min-h-[52px] items-center gap-2 rounded-xl border border-[#CFE0F8] bg-[#EEF6FF] px-3 sm:hidden"><Bell className="h-[17px] w-[17px] shrink-0 text-[#004BB8]" aria-hidden="true" /><h2 className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-950">Track this flight price</h2>{pending ? <LoaderCircle className="h-4 w-4 animate-spin text-[#004BB8]" aria-hidden="true" /> : null}{switchButton("mobile")}</div>
      <div className="hidden rounded-2xl border border-[#CFE0F8] bg-[#EEF6FF] px-4 py-2 shadow-[0_10px_26px_-24px_rgba(15,23,42,0.45)] sm:block sm:min-h-[56px]">
        <div className="flex min-h-10 items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><Bell className="h-[18px] w-[18px] shrink-0 text-[#004BB8]" strokeWidth={2} aria-hidden="true" /><h2 className="truncate text-sm font-semibold leading-5 text-slate-950">Track this flight price</h2></div><span className="flex items-center gap-1.5">{pending ? <LoaderCircle className="h-4 w-4 animate-spin text-[#004BB8]" aria-hidden="true" /> : null}{switchButton("desktop")}</span></div>
      </div>
    </section>
    {mobileEditor}
    {desktopEditor}
    {feedback && feedback !== "error-save" ? <div role={feedback.startsWith("error") ? "alert" : "status"} aria-live="polite" className={cn("fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[110] mx-auto flex max-w-md items-center gap-2.5 rounded-[14px] border border-slate-200 bg-white px-3 py-2.5 shadow-[0_12px_34px_rgba(15,23,42,0.2)] transition duration-200", snackbarLeaving ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100")}><CheckCircle2 className={cn("h-5 w-5", feedback.startsWith("error") ? "text-rose-600" : "text-[#004BB8]")} aria-hidden="true" /><strong className="text-sm text-slate-950">{feedback === "saved" ? "Price alert saved" : feedback === "paused" ? "Price alert paused" : "Couldn't pause price alert"}</strong></div> : null}
  </>;
}
