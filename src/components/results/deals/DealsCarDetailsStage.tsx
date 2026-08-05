"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CarDetailsExperience } from "@/components/results/CarDetailsClient";
import { useLocale } from "@/components/layout/LocaleProvider";
import type { NormalizedCarResult } from "@/lib/cars/types";
import type { TravelSearchResponse } from "@/lib/travel/searchContract";
import { translations as en } from "@/lib/i18n/en";
import { buildDealsCarRequestIdentity, buildDealsCarRequestPayload } from "@/lib/deals/dealsCarResults";
import type { DealsSearch } from "@/lib/deals/dealsSearchParams";
import type { DealsTripPlan, DealsTripPlanCar } from "@/lib/deals/dealsTripPlan";
import { buildDealsCarDetailsSelection, getEffectiveDealsCarDetailsId, isCurrentDealsCarDetailsResponse } from "@/lib/deals/dealsCarDetails";

type LoadState = "loading" | "available" | "unavailable" | "error";

export function DealsCarDetailsStage({ search, carId, plan, confirming, confirmationError, onConfirm }: { search: DealsSearch; carId: string | null; plan: DealsTripPlan | null; confirming: boolean; confirmationError: string; onConfirm: (selection: DealsTripPlanCar) => void }) {
  const { t: dictionary } = useLocale();
  const t = useCallback((key: string) => dictionary[key] ?? en[key] ?? key, [dictionary]);
  const effectiveCarId = getEffectiveDealsCarDetailsId(carId, plan?.car?.id);
  const requestIdentity = useMemo(() => `${buildDealsCarRequestIdentity(search)}::${effectiveCarId ?? ""}`, [search, effectiveCarId]);
  const payloadJson = useMemo(() => JSON.stringify(buildDealsCarRequestPayload(search)), [search]);
  const [retryGeneration, setRetryGeneration] = useState(0);
  const [state, setState] = useState<LoadState>("loading");
  const [car, setCar] = useState<NormalizedCarResult | null>(null);
  const [resultReceivedAt, setResultReceivedAt] = useState<number | null>(null);
  const [error, setError] = useState("");
  const latestRequestRef = useRef("");
  const retryFocusRef = useRef(false);
  const loadingRef = useRef<HTMLDivElement | null>(null);
  const modelRef = useRef<HTMLHeadingElement | null>(null);
  const unavailableRef = useRef<HTMLHeadingElement | null>(null);
  const errorRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    if (!effectiveCarId) { queueMicrotask(() => { setState("unavailable"); setCar(null); setResultReceivedAt(null); }); return; }
    const controller = new AbortController();
    const lifecycleId = `${requestIdentity}::${retryGeneration}`;
    latestRequestRef.current = lifecycleId;
    queueMicrotask(() => { if (controller.signal.aborted || latestRequestRef.current !== lifecycleId) return; setState("loading"); setCar(null); setResultReceivedAt(null); setError(""); if (retryFocusRef.current) loadingRef.current?.focus({ preventScroll: true }); });
    fetch("/api/cars/search", { method: "POST", headers: { "Content-Type": "application/json", "x-search-request-id": `guided-car-details-${retryGeneration}` }, body: payloadJson, signal: controller.signal }).then(async (response) => {
      let data: TravelSearchResponse<NormalizedCarResult> | null = null;
      try { data = await response.json() as TravelSearchResponse<NormalizedCarResult>; } catch { data = null; }
      if (controller.signal.aborted || latestRequestRef.current !== lifecycleId) return;
      if (!response.ok || !data || !Array.isArray(data.results)) throw new Error("unavailable");
      const selected = data.results.find((item) => isCurrentDealsCarDetailsResponse(effectiveCarId, item));
      if (!selected) { setCar(null); setResultReceivedAt(null); setState("unavailable"); return; }
      if (!buildDealsCarDetailsSelection({ car: selected, requestedCarId: effectiveCarId, search, resultReceivedAt: Date.now() })) { setCar(null); setResultReceivedAt(null); setState("unavailable"); return; }
      setCar(selected); setResultReceivedAt(Date.now()); setState("available");
    }).catch((reason: unknown) => { if (controller.signal.aborted || latestRequestRef.current !== lifecycleId) return; setCar(null); setResultReceivedAt(null); setError(reason instanceof Error ? reason.message : "unavailable"); setState("error"); });
    return () => controller.abort();
  }, [effectiveCarId, payloadJson, requestIdentity, retryGeneration, search]);

  useEffect(() => {
    if (!retryFocusRef.current || state === "loading") return;
    if (state === "available") modelRef.current?.focus({ preventScroll: true });
    if (state === "unavailable") unavailableRef.current?.focus({ preventScroll: true });
    if (state === "error") errorRef.current?.focus({ preventScroll: true });
    retryFocusRef.current = false;
  }, [state]);

  const selection = car && effectiveCarId && resultReceivedAt ? buildDealsCarDetailsSelection({ car, requestedCarId: effectiveCarId, search, resultReceivedAt }) : null;
  const retry = () => { retryFocusRef.current = true; setState("loading"); setCar(null); setResultReceivedAt(null); setError(""); setRetryGeneration((value) => value + 1); };

  if (state === "loading") return <div ref={loadingRef} tabIndex={-1} role="status" data-deals-guided-car-details-loading className="mt-6 space-y-4 outline-none" aria-label={t("deals.guided.carDetails.loading")}><p className="text-lg font-bold text-slate-950">{t("deals.guided.carDetails.loading")}</p><div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" /><div className="h-52 animate-pulse rounded-2xl border border-slate-200 bg-white" /></div>;
  if (state === "error") return <div data-deals-guided-car-details-error className="mt-6 rounded-2xl border border-red-200 bg-white p-5 shadow-sm sm:p-8"><h2 ref={errorRef} tabIndex={-1} className="text-xl font-extrabold text-slate-950 outline-none">{t("deals.guided.carDetails.errorTitle")}</h2><p className="mt-2 max-w-2xl leading-7 text-slate-600">{t("deals.guided.carDetails.errorBody")}</p><Button type="button" className="mt-4 min-h-11" onClick={retry}>{t("deals.guided.carDetails.retry")}</Button><span className="sr-only">{error}</span></div>;
  if (state === "unavailable" || !car) return <div data-deals-guided-car-details-unavailable className="mt-6 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm sm:p-8"><h2 ref={unavailableRef} tabIndex={-1} className="text-xl font-extrabold text-slate-950 outline-none">{t("deals.guided.carDetails.unavailableTitle")}</h2><p className="mt-2 max-w-2xl leading-7 text-slate-600">{t("deals.guided.carDetails.unavailableBody")}</p><Button type="button" className="mt-4 min-h-11" onClick={retry}>{t("deals.guided.carDetails.retry")}</Button></div>;
  return <CarDetailsExperience car={car} search={{ pickupLocation: search.carPickupLocation, dropoffLocation: search.carReturnToDifferentLocation ? search.carReturnLocation : search.carPickupLocation, pickupDate: search.carPickupDate, pickupTime: search.carPickupTime, dropoffDate: search.carReturnDate, dropoffTime: search.carReturnTime, driverAge: search.carDriverAge }} embedded modelHeadingLevel={2} sectionHeadingLevel={3} itemHeadingLevel={4} modelHeadingRef={modelRef} primaryAction={{ kind: "guided-car", enabled: Boolean(selection) && !confirming, pending: confirming, label: t("deals.guided.carDetails.confirmReview"), accessibleLabel: t("deals.guided.carDetails.confirmReviewA11y").replace("{model}", car.modelName).replace("{company}", car.rentalCompanyName), unavailableMessage: t("deals.guided.carDetails.unavailableConfirm"), error: confirmationError, onActivate: () => { if (selection && !confirming) onConfirm(selection); } }} />;
}
