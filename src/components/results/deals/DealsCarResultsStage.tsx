"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CarsResultsExperience } from "@/components/results/CarsResultsClient";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as en } from "@/lib/i18n/en";
import type { NormalizedCarResult } from "@/lib/cars/types";
import type { TravelSearchResponse } from "@/lib/travel/searchContract";
import type { DealsSearch } from "@/lib/deals/dealsSearchParams";
import { buildDealsCarRequestIdentity, buildGuidedDealsCarActionHref } from "@/lib/deals/dealsCarResults";

type LoadState = "loading" | "available" | "empty" | "error";

function isNormalizedCarResult(value: unknown): value is NormalizedCarResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const car = value as Partial<NormalizedCarResult>;
  return typeof car.id === "string" && typeof car.modelName === "string" && typeof car.pickupLocation === "string" && Array.isArray(car.offers);
}

export function DealsCarResultsStage({ search }: { search: DealsSearch }) {
  const { t: dictionary } = useLocale();
  const t = useCallback((key: string) => dictionary[key] ?? en[key] ?? key, [dictionary]);
  const requestIdentity = useMemo(() => buildDealsCarRequestIdentity(search), [search]);
  const payloadJson = useMemo(() => {
    const params = new URL(requestIdentity, "https://kurioticket.invalid").searchParams;
    return JSON.stringify({
      pickupLocation: params.get("pickupLocation") ?? "",
      dropoffLocation: params.get("dropoffLocation") ?? "",
      pickupDate: params.get("pickupDate") ?? "",
      pickupTime: params.get("pickupTime") ?? "",
      dropoffDate: params.get("dropoffDate") ?? "",
      dropoffTime: params.get("dropoffTime") ?? "",
      driverAge: params.get("driverAge") ?? "",
    });
  }, [requestIdentity]);
  const [retryGeneration, setRetryGeneration] = useState(0);
  const [state, setState] = useState<LoadState>("loading");
  const [results, setResults] = useState<NormalizedCarResult[]>([]);
  const [error, setError] = useState("");
  const latestRequestRef = useRef("");
  const loadingRef = useRef<HTMLDivElement | null>(null);
  const terminalHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const retryFocusRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const lifecycleId = `${requestIdentity}::${retryGeneration}`;
    latestRequestRef.current = lifecycleId;
    queueMicrotask(() => {
      if (controller.signal.aborted || latestRequestRef.current !== lifecycleId) return;
      setState("loading");
      setError("");
      if (retryFocusRef.current) loadingRef.current?.focus({ preventScroll: true });
    });
    fetch("/api/cars/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-search-request-id": `guided-car-${retryGeneration}` },
      body: payloadJson,
      signal: controller.signal,
    }).then(async (response) => {
      let data: TravelSearchResponse<NormalizedCarResult> | null = null;
      try { data = await response.json() as TravelSearchResponse<NormalizedCarResult>; } catch { data = null; }
      if (controller.signal.aborted || latestRequestRef.current !== lifecycleId) return;
      if (!response.ok || !data || !Array.isArray(data.results)) throw new Error("unavailable");
      const validResults = data.results.filter(isNormalizedCarResult);
      setResults(validResults);
      setState(validResults.length ? "available" : "empty");
    }).catch((reason: unknown) => {
      if (controller.signal.aborted || latestRequestRef.current !== lifecycleId) return;
      setResults([]); setError(reason instanceof Error ? reason.message : "unavailable"); setState("error");
    });
    return () => controller.abort();
  }, [payloadJson, requestIdentity, retryGeneration]);

  useEffect(() => {
    if (!retryFocusRef.current || state === "loading") return;
    terminalHeadingRef.current?.focus({ preventScroll: true });
  }, [state]);

  const retry = () => { retryFocusRef.current = true; setState("loading"); setError(""); setRetryGeneration((value) => value + 1); };
  const heading = t("deals.guided.carResults.title");

  if (state === "loading") return <div ref={loadingRef} tabIndex={-1} role="status" className="mt-6 space-y-4 outline-none" data-deals-guided-car-results-loading aria-label={t("deals.guided.carResults.loading")}><p className="text-lg font-bold text-slate-950">{t("deals.guided.carResults.loading")}</p>{[0,1,2].map((item) => <div key={item} className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-white" />)}</div>;
  if (state === "error") return <div data-deals-guided-car-results-error className="mt-6 rounded-2xl border border-red-200 bg-white p-5 shadow-sm sm:p-8"><h2 ref={terminalHeadingRef} tabIndex={-1} className="text-xl font-extrabold text-slate-950 outline-none">{t("deals.guided.carResults.errorTitle")}</h2><p className="mt-2 max-w-2xl leading-7 text-slate-600">{t("deals.guided.carResults.errorBody")}</p><Button type="button" className="mt-4 min-h-11" onClick={retry}>{t("deals.guided.carResults.retry")}</Button><span className="sr-only">{error}</span></div>;
  if (state === "empty") return <div data-deals-guided-car-results-empty className="mt-6 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm sm:p-8"><h2 ref={terminalHeadingRef} tabIndex={-1} className="text-xl font-extrabold text-slate-950 outline-none">{t("deals.guided.carResults.emptyTitle")}</h2><p className="mt-2 max-w-2xl leading-7 text-slate-600">{t("deals.guided.carResults.emptyBody")}</p><Button type="button" className="mt-4 min-h-11" onClick={retry}>{t("deals.guided.carResults.retry")}</Button></div>;
  return <CarsResultsExperience results={results} inventoryStatus="available" hasSearchContext resultHeadingId="guided-car-results-heading" resultHeading={heading} embedded detailsHrefForCar={(car) => buildGuidedDealsCarActionHref(search, car.id)} actionLabel={t("deals.guided.carResults.actionLabel")} actionAriaLabelForCar={(car) => t("deals.guided.carResults.actionAriaLabel").replace("{model}", car.modelName).replace("{company}", car.rentalCompanyName)} />;
}
