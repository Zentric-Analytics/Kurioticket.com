"use client";

import { createPortal } from "react-dom";
import { Bell, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { buildCanonicalFlightPriceAlertQuery, buildFlightPriceAlertPayload, priceAlertTargetSchema, type CanonicalFlightPriceAlertQuery } from "@/lib/price-alerts/flightPriceAlerts";
import { acquireMobileResultsScrollLock, type MobileResultsScrollLockRelease } from "@/lib/search/mobileResultsScrollLock";
import { cn } from "@/lib/utils";

type WebFlightAlert = {
  id: string;
  type: "FLIGHT" | "HOTEL" | "CAR";
  origin: string | null;
  destination: string;
  targetPrice: string | null;
  currency: string | null;
  status: "ACTIVE" | "PAUSED" | "TRIGGERED" | "EXPIRED" | "DELETED";
  query: unknown;
};

const sameSearch = (alert: WebFlightAlert, query: CanonicalFlightPriceAlertQuery) => {
  if (alert.type !== "FLIGHT") return false;
  const parsed = buildCanonicalFlightPriceAlertQuery(alert.query);
  if (!parsed.success) return false;
  const candidate = parsed.data;
  return candidate.origin === query.origin
    && candidate.destination === query.destination
    && candidate.departureDate === query.departureDate
    && (candidate.returnDate ?? "") === (query.returnDate ?? "")
    && candidate.tripType === query.tripType
    && candidate.cabinClass === query.cabinClass
    && candidate.adults === query.adults
    && candidate.children === query.children
    && candidate.infants === query.infants
    && candidate.travelers === query.travelers
    && candidate.currency === query.currency;
};

const replaceAlert = (alerts: WebFlightAlert[], alert: WebFlightAlert) => [...alerts.filter((item) => item.id !== alert.id), alert];

export function FlightPriceAlertControl({ query: queryInput }: { query: unknown }) {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const parsedQuery = useMemo(() => buildCanonicalFlightPriceAlertQuery(queryInput), [queryInput]);
  const query = parsedQuery.success ? parsedQuery.data : null;
  const [alerts, setAlerts] = useState<WebFlightAlert[]>([]);
  const [knownQueryKey, setKnownQueryKey] = useState("");
  const [targetOpen, setTargetOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const switchRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const scrollLockRef = useRef<MobileResultsScrollLockRelease | null>(null);
  const matchingAlert = useMemo(() => query ? alerts.filter((alert) => sameSearch(alert, query)).find((alert) => alert.status === "ACTIVE") ?? alerts.filter((alert) => sameSearch(alert, query)).find((alert) => alert.status === "PAUSED") : undefined, [alerts, query]);
  const tracking = matchingAlert?.status === "ACTIVE";
  const queryKey = query ? JSON.stringify(query) : "";
  const known = Boolean(queryKey) && knownQueryKey === queryKey;

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    void fetch("/api/price-alerts", { cache: "no-store", signal: controller.signal }).then(async (response) => {
      if (response.status === 401) { setAlerts([]); setKnownQueryKey(queryKey); return; }
      if (!response.ok) throw new Error("load failed");
      const body = await response.json() as { alerts?: WebFlightAlert[] };
      setAlerts(Array.isArray(body.alerts) ? body.alerts : []);
      setKnownQueryKey(queryKey);
    }).catch((caught) => { if ((caught as Error).name !== "AbortError") setKnownQueryKey(queryKey); });
    return () => controller.abort();
  }, [query, queryKey]);

  useLayoutEffect(() => {
    if (!targetOpen) return;
    const launcher = switchRef.current;
    scrollLockRef.current ??= acquireMobileResultsScrollLock();
    closeRef.current?.focus({ preventScroll: true });
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pendingRef.current) { event.preventDefault(); setTargetOpen(false); }
      if (event.key !== "Tab") return;
      const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])];
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); scrollLockRef.current?.(); scrollLockRef.current = null; launcher?.focus({ preventScroll: true }); };
  }, [targetOpen]);

  if (!query) return null;
  const signIn = () => router.push(`/auth/signin?callbackUrl=${encodeURIComponent(location.pathname + location.search)}`);
  const patchStatus = async (alert: WebFlightAlert, status: "ACTIVE" | "PAUSED") => {
    const response = await fetch(`/api/price-alerts/${encodeURIComponent(alert.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (response.status === 401) { signIn(); return null; }
    if (!response.ok) throw new Error("Unable to update price alert.");
    const body = await response.json() as { alert: WebFlightAlert };
    setAlerts((current) => replaceAlert(current, body.alert));
    return body.alert;
  };
  const toggle = async (next: boolean) => {
    if (pending || !known) return;
    setError("");
    if (sessionStatus === "unauthenticated") { signIn(); return; }
    if (next && matchingAlert?.status === "PAUSED") {
      setPending(true);
      try { await patchStatus(matchingAlert, "ACTIVE"); } catch { setError("Unable to update price alert. Try again."); } finally { setPending(false); }
      return;
    }
    if (next) { setTarget(""); setTargetOpen(true); return; }
    if (!matchingAlert || matchingAlert.status !== "ACTIVE") return;
    setPending(true);
    try { await patchStatus(matchingAlert, "PAUSED"); } catch { setError("Unable to update price alert. Try again."); } finally { setPending(false); }
  };
  const createAlert = async () => {
    const parsedTarget = priceAlertTargetSchema.safeParse(target.trim());
    if (!parsedTarget.success || !/^\d+(?:\.\d{1,2})?$/.test(target.trim())) { setError("Enter a valid target price with up to two decimal places."); return; }
    setPending(true); setError("");
    try {
      const response = await fetch("/api/price-alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildFlightPriceAlertPayload({ origin: query.origin, destination: query.destination, targetPrice: parsedTarget.data, currency: query.currency, query })) });
      if (response.status === 401) { signIn(); return; }
      const body = await response.json().catch(() => ({})) as { alert?: WebFlightAlert; error?: string };
      if (response.status === 409 && body.alert) { setAlerts((current) => replaceAlert(current, body.alert!)); if (body.alert.status === "PAUSED") await patchStatus(body.alert, "ACTIVE"); setTargetOpen(false); return; }
      if (!response.ok || !body.alert) { setError(body.error || "Unable to create price alert. Try again."); return; }
      setAlerts((current) => replaceAlert(current, body.alert!)); setTargetOpen(false);
    } catch { setError("Unable to create price alert. Try again."); } finally { setPending(false); }
  };

  const sheet = targetOpen && typeof document !== "undefined" ? createPortal(<div className="fixed inset-0 z-[10040] flex items-end bg-slate-950/40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden" role="presentation"><button type="button" aria-label="Close price alert" disabled={pending} className="absolute inset-0" onClick={() => setTargetOpen(false)} /><section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="flight-price-alert-title" className="relative z-10 w-full rounded-[22px] border border-slate-200 bg-white px-4 pb-4 pt-2 shadow-[0_-12px_36px_rgba(15,23,42,0.18)]"><header className="flex min-h-11 items-center justify-between gap-3"><h2 id="flight-price-alert-title" className="text-lg font-bold text-slate-950">Track prices</h2><button ref={closeRef} type="button" aria-label="Close price alert" disabled={pending} onClick={() => setTargetOpen(false)} className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30"><X className="h-5 w-5" aria-hidden="true" /></button></header><label className="mt-3 block text-[13px] font-semibold text-slate-700">Target price ({query.currency})<input autoFocus aria-label={`Target price in ${query.currency}`} inputMode="decimal" value={target} disabled={pending} onChange={(event) => { setTarget(event.target.value); setError(""); }} className="mt-1.5 block min-h-12 w-full rounded-[10px] border border-slate-300 px-3 text-base text-slate-950 outline-none focus:border-[#004BB8] focus:ring-2 focus:ring-[#004BB8]/20" /></label>{error ? <p role="alert" aria-live="polite" className="mt-3 text-[13px] font-semibold text-red-700">{error}</p> : null}<button type="button" disabled={pending} onClick={() => void createAlert()} className="mt-4 min-h-12 w-full rounded-[10px] bg-[#004BB8] px-4 text-[15px] font-bold text-white disabled:opacity-60">{pending ? "Creating…" : "Create alert"}</button></section></div>, document.body) : null;

  return <section data-flight-price-alert aria-label="Flight price alert" className="sm:hidden"><div className="flex min-h-[52px] items-center gap-2 rounded-xl border border-[#CFE0F8] bg-[#EEF6FF] px-3"><Bell className="h-[17px] w-[17px] shrink-0 text-[#004BB8]" strokeWidth={2} aria-hidden="true" /><h2 className="min-w-0 flex-1 truncate text-[13px] font-bold leading-4 text-slate-950">Track this flight price</h2>{pending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#004BB8]/25 border-t-[#004BB8] motion-reduce:animate-none" aria-hidden="true" /> : null}<button ref={switchRef} type="button" role="switch" aria-label="Track this flight price" aria-checked={Boolean(tracking)} aria-busy={pending || !known} disabled={pending || !known} onClick={() => void toggle(!tracking)} className={cn("relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30 disabled:opacity-55", tracking ? "border-[#004BB8] bg-[#004BB8]" : "border-slate-300 bg-slate-200")}><span className={cn("inline-block h-6 w-6 rounded-full bg-white shadow-sm transition-transform", tracking ? "translate-x-5" : "translate-x-0.5")} /></button></div>{error && !targetOpen ? <p role="alert" className="mt-2 text-[12px] font-semibold text-red-700">{error}</p> : null}{sheet}</section>;
}
