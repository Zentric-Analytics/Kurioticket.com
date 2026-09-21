"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CarSearchParams, NormalizedCarResult } from "@/lib/cars/types";
import {
  buildAutomaticCarPriceAlertPayload,
  matchingAutomaticCarPriceAlert,
  type MatchableCarPriceAlert,
} from "@/lib/price-alerts/carPriceAlerts";
import { supportedCurrencies } from "@/lib/region/supportedRegions";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as en } from "@/lib/i18n/en";

const supported = new Set(supportedCurrencies.map(({ code }) => code));
export const CAR_PRICE_ALERT_SNACKBAR_DURATION_MS = 3_600;

type WebCarPriceAlert = MatchableCarPriceAlert & { id: string };
type Feedback = "active" | "paused" | "error-start" | "error-pause" | null;

export function CarPriceAlertControl({ search, results }: { search: CarSearchParams; results: NormalizedCarResult[] }) {
  const router = useRouter();
  const { t: dictionary } = useLocale();
  const t = useCallback((key: string) => dictionary[key] ?? en[key] ?? key, [dictionary]);
  const baseline = useMemo(() => results.flatMap(({ offers }) => offers)
    .filter(({ totalPrice, currency }) => Number.isFinite(totalPrice) && totalPrice > 0 && supported.has(currency.trim().toUpperCase()))
    .sort((left, right) => left.totalPrice - right.totalPrice)[0], [results]);
  const [matchingAlert, setMatchingAlert] = useState<WebCarPriceAlert>();
  const [reconciled, setReconciled] = useState(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [snackbarLeaving, setSnackbarLeaving] = useState(false);
  const pendingRef = useRef(false);
  const requestRef = useRef(0);

  const reconcile = useCallback(async () => {
    const request = ++requestRef.current;
    try {
      const response = await fetch("/api/price-alerts", { cache: "no-store" });
      if (request !== requestRef.current) return;
      if (response.status === 401) { setMatchingAlert(undefined); setReconciled(true); return; }
      if (!response.ok) return;
      const data = await response.json() as { alerts?: WebCarPriceAlert[] };
      setMatchingAlert(matchingAutomaticCarPriceAlert(data.alerts ?? [], search));
      setReconciled(true);
    } finally {
      if (request === requestRef.current) setReconciled(true);
    }
  }, [search]);

  useEffect(() => { void reconcile(); return () => { requestRef.current += 1; }; }, [reconcile]);
  useEffect(() => {
    if (!feedback) return;
    const leave = window.setTimeout(() => setSnackbarLeaving(true), CAR_PRICE_ALERT_SNACKBAR_DURATION_MS - 180);
    const dismiss = window.setTimeout(() => setFeedback(null), CAR_PRICE_ALERT_SNACKBAR_DURATION_MS);
    return () => { window.clearTimeout(leave); window.clearTimeout(dismiss); };
  }, [feedback]);

  const signIn = () => router.push(`/auth/signin?callbackUrl=${encodeURIComponent(location.pathname + location.search)}`);
  const showFeedback = (next: Exclude<Feedback, null>) => {
    setSnackbarLeaving(false);
    setFeedback(next);
  };
  const patchStatus = async (alert: WebCarPriceAlert, status: "ACTIVE" | "PAUSED") => {
    const response = await fetch(`/api/price-alerts/${encodeURIComponent(alert.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (response.status === 401) { signIn(); return undefined; }
    if (!response.ok) return undefined;
    return ((await response.json()) as { alert: WebCarPriceAlert }).alert;
  };
  const toggle = async (next: boolean) => {
    if (!baseline || !reconciled || pendingRef.current) return;
    if (next === (matchingAlert?.status === "ACTIVE")) return;
    pendingRef.current = true; setPending(true); setFeedback(null);
    try {
      let saved: WebCarPriceAlert | undefined;
      if (!next) saved = matchingAlert ? await patchStatus(matchingAlert, "PAUSED") : undefined;
      else if (matchingAlert?.status === "PAUSED") saved = await patchStatus(matchingAlert, "ACTIVE");
      else {
        const response = await fetch("/api/price-alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildAutomaticCarPriceAlertPayload(search, baseline.totalPrice, baseline.currency)) });
        if (response.status === 401) { signIn(); return; }
        if (response.status === 409) {
          const duplicate = ((await response.json()) as { alert?: WebCarPriceAlert }).alert;
          const canonical = duplicate && matchingAutomaticCarPriceAlert([duplicate], search);
          saved = canonical?.status === "PAUSED" ? await patchStatus(canonical, "ACTIVE") : canonical;
        } else if (response.ok) saved = ((await response.json()) as { alert: WebCarPriceAlert }).alert;
      }
      if (!saved) { showFeedback(next ? "error-start" : "error-pause"); return; }
      setMatchingAlert(saved);
      showFeedback(next ? "active" : "paused");
    } catch { showFeedback(next ? "error-start" : "error-pause"); }
    finally { pendingRef.current = false; setPending(false); }
  };

  if (!baseline) return null;
  const tracking = matchingAlert?.status === "ACTIVE";
  const disabled = pending || !reconciled;
  return <>
    <section
      aria-label={t("carsResults.priceTracking.title")}
      data-cars-price-alert
      className="mb-1 w-full min-w-0 max-w-full rounded-xl border border-[#C8DFF7] bg-[#EDF6FF] px-3 py-0 sm:mb-0 sm:rounded-2xl sm:border-blue-100 sm:bg-white sm:px-4 sm:py-1 sm:shadow-sm lg:w-auto"
    >
      <div className="flex min-h-[52px] min-w-0 items-center gap-2 sm:gap-2.5">
        <span className="inline-flex shrink-0 items-center justify-center text-[#1769AA] sm:h-8 sm:w-8 sm:rounded-full sm:bg-blue-50 sm:text-[#004BB8]"><Bell className="h-[17px] w-[17px]" aria-hidden="true" /></span>
        <h2 className="min-w-0 flex-1 [overflow-wrap:anywhere] text-[13px] font-bold leading-4 text-slate-950 sm:text-sm">{t("carsResults.priceTracking.title")}</h2>
        <span className="flex h-11 shrink-0 items-center gap-1.5"><span className="flex w-5 justify-center">{pending ? <LoaderCircle className="h-4 w-4 animate-spin text-[#004BB8] motion-reduce:animate-none" aria-hidden="true" /> : null}</span><span className="flex w-[51px] justify-end"><button type="button" role="switch" aria-checked={tracking} aria-busy={pending} disabled={disabled} aria-label={t("carsResults.priceTracking.title")} onClick={() => void toggle(!tracking)} className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 disabled:cursor-wait ${tracking ? "border-[#004BB8] bg-[#004BB8]" : "border-slate-300 bg-slate-200"}`}><span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${tracking ? "translate-x-[22px] rtl:-translate-x-[22px]" : "translate-x-[3px] rtl:-translate-x-[3px]"}`} /></button></span></span>
      </div>
    </section>
    {feedback ? <div role={feedback.startsWith("error") ? "alert" : "status"} aria-live="polite" className={`fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[110] mx-auto flex max-w-md items-center gap-2.5 rounded-[14px] border border-slate-200 bg-white px-3 py-2.5 shadow-[0_12px_34px_rgba(15,23,42,0.2)] transition duration-200 ${snackbarLeaving ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100 animate-[cars-alert-enter_200ms_ease-out]"}`}>
      <CheckCircle2 className={`h-5 w-5 shrink-0 ${feedback.startsWith("error") ? "text-rose-600" : "text-[#004BB8]"}`} aria-hidden="true" />
      <span className="min-w-0 flex-1"><strong className="block text-sm leading-5 text-slate-950">{t(feedback === "active" ? "carsResults.priceTracking.active" : feedback === "paused" ? "carsResults.priceTracking.paused" : feedback === "error-start" ? "carsResults.priceTracking.errorStart" : "carsResults.priceTracking.errorPause")}</strong>{feedback === "active" ? <span className="block text-xs leading-4 text-slate-600">{t("carsResults.priceTracking.activeBody")}</span> : null}</span>
      {feedback === "active" ? <Link href="/price-alerts" className="inline-flex min-h-11 shrink-0 items-center px-1 text-sm font-bold text-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35">{t("carsResults.priceTracking.manage")}</Link> : null}
    </div> : null}
  </>;
}
