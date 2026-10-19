"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CarOffer, CarSearchParams, NormalizedCarResult } from "@/lib/cars/types";
import {
  buildAutomaticCarPriceAlertPayload,
  matchingAutomaticCarPriceAlert,
  type MatchableCarPriceAlert,
  type CarPriceAlertOfferScope,
} from "@/lib/price-alerts/carPriceAlerts";
import { supportedCurrencies } from "@/lib/region/supportedRegions";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as en } from "@/lib/i18n/en";

const supported = new Set(supportedCurrencies.map(({ code }) => code));
const AUTH_REDIRECT = Symbol("auth-redirect");
export const CAR_PRICE_ALERT_SNACKBAR_DURATION_MS = 3_600;

type WebCarPriceAlert = MatchableCarPriceAlert & { id: string };
type SuccessFeedback = "active" | "inactive" | null;
type PriceTrackingError = "start" | "stop" | null;

export function CarPriceAlertControl({ search, car, offer }: {
  search: CarSearchParams;
  car: NormalizedCarResult;
  offer: CarOffer;
}) {
  const router = useRouter();
  const { t: dictionary } = useLocale();
  const t = useCallback((key: string) => dictionary[key] ?? en[key] ?? key, [dictionary]);
  const baseline = Number.isFinite(offer.totalPrice) && offer.totalPrice > 0 && supported.has(offer.currency.trim().toUpperCase()) ? offer : undefined;
  const scope: CarPriceAlertOfferScope = useMemo(() => ({
    resultId: car.id,
    offerId: offer.id,
    providerName: offer.bookingProviderName.trim() || offer.rentalCompanyName.trim(),
  }), [car.id, offer.id, offer.bookingProviderName, offer.rentalCompanyName]);
  const [matchingAlert, setMatchingAlert] = useState<WebCarPriceAlert>();
  const [reconciled, setReconciled] = useState(false);
  const [pending, setPending] = useState(false);
  const [optimisticTracking, setOptimisticTracking] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<SuccessFeedback>(null);
  const [error, setError] = useState<PriceTrackingError>(null);
  const [snackbarLeaving, setSnackbarLeaving] = useState(false);
  const pendingRef = useRef(false);
  const requestRef = useRef(0);
  const switchRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const reconcile = useCallback(async () => {
    const request = ++requestRef.current;
    try {
      const response = await fetch("/api/price-alerts", { cache: "no-store" });
      if (request !== requestRef.current) return;
      if (response.status === 401) { setMatchingAlert(undefined); setReconciled(true); return; }
      if (!response.ok) return;
      const data = await response.json() as { alerts?: WebCarPriceAlert[] };
      setMatchingAlert(matchingAutomaticCarPriceAlert(data.alerts ?? [], search, scope));
      setReconciled(true);
    } finally {
      if (request === requestRef.current) setReconciled(true);
    }
  }, [search, scope]);

  useEffect(() => { void reconcile(); return () => { requestRef.current += 1; }; }, [reconcile]);
  useEffect(() => {
    if (!feedback) return;
    const leave = window.setTimeout(() => setSnackbarLeaving(true), CAR_PRICE_ALERT_SNACKBAR_DURATION_MS - 180);
    const dismiss = window.setTimeout(() => setFeedback(null), CAR_PRICE_ALERT_SNACKBAR_DURATION_MS);
    return () => { window.clearTimeout(leave); window.clearTimeout(dismiss); };
  }, [feedback]);
  useEffect(() => {
    if (!error) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const switchElement = switchRef.current;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setError(null); };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); switchElement?.focus(); };
  }, [error]);

  const signIn = () => router.push(`/auth/signin?callbackUrl=${encodeURIComponent(location.pathname + location.search)}`);
  const showFeedback = (next: Exclude<SuccessFeedback, null>) => {
    setSnackbarLeaving(false);
    setFeedback(next);
  };
  const patchStatus = async (alert: WebCarPriceAlert, status: "ACTIVE" | "PAUSED") => {
    const response = await fetch(`/api/price-alerts/${encodeURIComponent(alert.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (response.status === 401) { signIn(); throw AUTH_REDIRECT; }
    if (!response.ok) return undefined;
    return ((await response.json()) as { alert: WebCarPriceAlert }).alert;
  };
  const toggle = async (next: boolean) => {
    if (!baseline || !reconciled || pendingRef.current) return;
    if (next === (matchingAlert?.status === "ACTIVE")) return;
    pendingRef.current = true; setPending(true); setOptimisticTracking(next); setFeedback(null); setError(null);
    try {
      let saved: WebCarPriceAlert | undefined;
      if (!next) saved = matchingAlert ? await patchStatus(matchingAlert, "PAUSED") : undefined;
      else if (matchingAlert?.status === "PAUSED") saved = await patchStatus(matchingAlert, "ACTIVE");
      else {
        const response = await fetch("/api/price-alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildAutomaticCarPriceAlertPayload(search, baseline.totalPrice, baseline.currency, scope)) });
        if (response.status === 401) { signIn(); return; }
        if (response.status === 409) {
          const duplicate = ((await response.json()) as { alert?: WebCarPriceAlert }).alert;
          const canonical = duplicate && matchingAutomaticCarPriceAlert([duplicate], search, scope);
          saved = canonical?.status === "PAUSED" ? await patchStatus(canonical, "ACTIVE") : canonical;
        } else if (response.ok) saved = ((await response.json()) as { alert: WebCarPriceAlert }).alert;
      }
      if (!saved) { setError(next ? "start" : "stop"); return; }
      setMatchingAlert(saved);
      showFeedback(next ? "active" : "inactive");
    } catch (cause) { if (cause !== AUTH_REDIRECT) setError(next ? "start" : "stop"); }
    finally { pendingRef.current = false; setPending(false); setOptimisticTracking(null); }
  };

  if (!baseline || !scope.providerName) return null;
  const committedTracking = matchingAlert?.status === "ACTIVE";
  const tracking = optimisticTracking ?? committedTracking;
  const disabled = !reconciled;
  return <>
    <section aria-label={t("carsResults.priceTracking.title")} data-cars-price-alert className="inline-flex w-fit max-w-full shrink-0 items-center rounded-[10px] border border-[#CFE0F8] bg-[#EEF6FF] px-1 py-0 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
      <div className="flex min-h-11 min-w-0 items-center gap-0.5">
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/85">
          <Bell className="h-3.5 w-3.5 text-[#1769AA]" aria-hidden="true" />
        </span>
        <span className="whitespace-nowrap text-[11px] font-semibold leading-4 tracking-[-0.005em] text-[#07133B]">{t("carsResults.priceTracking.title")}</span>
        <button ref={switchRef} type="button" role="switch" aria-checked={tracking} aria-busy={pending} disabled={disabled} aria-label={`${t("carsResults.priceTracking.title")} for ${scope.providerName} offer`} onClick={() => void toggle(!tracking)} className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35">
          <span aria-hidden="true" className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${tracking ? "border-[#004BB8] bg-[#004BB8]" : "border-slate-300 bg-slate-200"}`}>
            <span className={`h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${tracking ? "translate-x-[23px] rtl:-translate-x-[23px]" : "translate-x-[3px] rtl:-translate-x-[3px]"}`} />
          </span>
        </button>
      </div>
    </section>
    {feedback ? <div role="status" aria-live="polite" className={`fixed bottom-[calc(max(env(safe-area-inset-bottom),12px)+12px)] left-4 right-4 z-[110] mx-auto flex max-w-md items-center gap-2.5 rounded-[14px] border-[0.5px] border-[#C8DFF7] bg-[#EDF6FF] px-[13px] py-[11px] shadow-[0_4px_16px_rgba(15,23,42,0.16)] ${snackbarLeaving ? "cars-price-alert-snackbar-leaving" : "cars-price-alert-snackbar-entering"}`}>
      <CheckCircle2 className="h-5 w-5 shrink-0 text-[#1769AA]" aria-hidden="true" />
      <span className="flex min-w-0 flex-1 flex-col gap-px"><strong className="block text-[14px] font-bold leading-[19px] text-slate-950 lg:text-[15px] lg:font-bold lg:leading-5">{t(feedback === "active" ? "carsResults.priceTracking.active" : "carsResults.priceTracking.inactive")}</strong><span className="block text-[12.5px] leading-[17px] text-slate-600 lg:text-[13px] lg:font-medium lg:leading-5 lg:text-[#475569]">{t(feedback === "active" ? "carsResults.priceTracking.activeBody" : "carsResults.priceTracking.inactiveBody")}</span></span>
      <Link href="/price-alerts" className="inline-flex min-h-11 shrink-0 items-center px-1 text-[13.5px] font-bold text-[#1769AA] lg:text-[14px] lg:font-bold focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA]/35">{t("carsResults.priceTracking.manage")}</Link>
    </div> : null}
    {error ? <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.currentTarget === event.target) setError(null); }}><div ref={dialogRef} tabIndex={-1} role="alertdialog" aria-modal="true" aria-labelledby="cars-price-alert-error-title" aria-describedby="cars-price-alert-error-body" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl outline-none"><h2 id="cars-price-alert-error-title" className="text-lg font-bold text-slate-950">{t(error === "start" ? "carsResults.priceTracking.errorStartTitle" : "carsResults.priceTracking.errorStopTitle")}</h2><p id="cars-price-alert-error-body" className="mt-2 text-sm leading-6 text-slate-600">{t(error === "start" ? "carsResults.priceTracking.errorStartBody" : "carsResults.priceTracking.errorStopBody")}</p><div className="mt-5 flex justify-end gap-2"><button type="button" className="min-h-11 rounded-xl px-4 text-sm font-bold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400" onClick={() => setError(null)}>{t("carsResults.priceTracking.cancel")}</button><button type="button" className="min-h-11 rounded-xl bg-[#1769AA] px-4 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA]/40" onClick={() => { const retry = error === "start"; setError(null); window.setTimeout(() => void toggle(retry), 0); }}>{t("carsResults.priceTracking.retry")}</button></div></div></div> : null}
  </>;
}
