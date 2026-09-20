"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";

import type { HotelSearchParams, PublicHotelResult } from "@/lib/types";
import { buildHotelPriceAlertPayload } from "@/lib/price-alerts/hotelPriceAlerts";
import { getHotelPriceDetails } from "@/lib/hotels/hotelResultAvailability";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as en } from "@/lib/i18n/en";
import { cn } from "@/lib/utils";

type WebPriceAlert = {
  id: string;
  type: "FLIGHT" | "HOTEL" | "CAR";
  destination: string;
  targetPrice: string | null;
  currency: string | null;
  status: "ACTIVE" | "PAUSED" | "TRIGGERED" | "EXPIRED" | "DELETED";
  query: Record<string, unknown>;
};

type Status = "idle" | "saving" | "saved" | "duplicate" | "error";

const canonical = (value: unknown) => String(value ?? "").trim().toLocaleLowerCase();

function matchesHotelSearch(alert: WebPriceAlert, search: HotelSearchParams) {
  if (alert.type !== "HOTEL") return false;
  const query = alert.query ?? {};
  const destination = canonical(query.destination || alert.destination);
  return destination === canonical(search.destination)
    && String(query.checkIn ?? "") === search.checkIn
    && String(query.checkOut ?? "") === search.checkOut
    && Number(query.guests) === Number(search.guests)
    && Number(query.rooms) === Number(search.rooms);
}

function replaceAlert(alerts: WebPriceAlert[], alert: WebPriceAlert) {
  return [...alerts.filter((item) => item.id !== alert.id), alert];
}

export function HotelPriceAlertControl({ search, results }: { search: HotelSearchParams; results: PublicHotelResult[] }) {
  const router = useRouter();
  const { t: dictionary } = useLocale();
  const t = useCallback((key: string) => dictionary[key] ?? en[key] ?? key, [dictionary]);
  const currencies = useMemo(
    () => [...new Set(results.map(getHotelPriceDetails).filter((value): value is NonNullable<typeof value> => value !== null).map(({ currency }) => currency))],
    [results],
  );
  const currency = currencies[0] ?? "";

  const [alerts, setAlerts] = useState<WebPriceAlert[]>([]);
  const [alertKnown, setAlertKnown] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status>("idle");

  const matchingAlert = useMemo(() => {
    const matching = alerts.filter((alert) => matchesHotelSearch(alert, search));
    return matching.find((alert) => alert.status === "ACTIVE")
      ?? matching.find((alert) => alert.status === "PAUSED");
  }, [alerts, search]);

  const isTracking = matchingAlert?.status === "ACTIVE";

  useEffect(() => {
    const controller = new AbortController();
    setAlertKnown(false);
    void fetch("/api/price-alerts", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) {
          setAlerts([]);
          setAlertKnown(true);
          return;
        }
        if (!response.ok) throw new Error("load failed");
        const body = await response.json() as { alerts?: WebPriceAlert[] };
        setAlerts(Array.isArray(body.alerts) ? body.alerts : []);
        setAlertKnown(true);
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") setAlertKnown(true);
      });
    return () => controller.abort();
  }, [search.checkIn, search.checkOut, search.destination, search.guests, search.rooms]);

  if (!currency) return null;

  const requireSignIn = () => {
    router.push(`/auth/signin?callbackUrl=${encodeURIComponent(location.pathname + location.search)}`);
  };

  const updateStatus = async (alert: WebPriceAlert, nextStatus: "ACTIVE" | "PAUSED") => {
    const response = await fetch(`/api/price-alerts/${encodeURIComponent(alert.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (response.status === 401) {
      requireSignIn();
      return null;
    }
    if (!response.ok) throw new Error("update failed");
    const body = await response.json() as { alert: WebPriceAlert };
    setAlerts((current) => replaceAlert(current, body.alert));
    return body.alert;
  };

  const saveTarget = async (close: () => void) => {
    const value = Number(target);
    if (!/^\d+(?:\.\d{1,2})?$/.test(target.trim()) || !Number.isFinite(value) || value <= 0) {
      setStatus("error");
      return;
    }

    setPending(true);
    setStatus("saving");
    try {
      const samePausedTarget = alerts.find((alert) =>
        alert.status === "PAUSED"
        && matchesHotelSearch(alert, search)
        && Number(alert.targetPrice) === value
        && alert.currency?.toUpperCase() === currency.toUpperCase(),
      );

      if (samePausedTarget) {
        const activated = await updateStatus(samePausedTarget, "ACTIVE");
        if (!activated) return;
        setStatus("saved");
        close();
        return;
      }

      const response = await fetch("/api/price-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildHotelPriceAlertPayload(search, value, currency)),
      });
      if (response.status === 401) {
        requireSignIn();
        return;
      }
      const body = await response.json().catch(() => ({})) as { alert?: WebPriceAlert };
      if (response.status === 409) {
        if (body.alert) setAlerts((current) => replaceAlert(current, body.alert!));
        setStatus("duplicate");
        return;
      }
      if (!response.ok || !body.alert) {
        setStatus("error");
        return;
      }
      setAlerts((current) => replaceAlert(current, body.alert!));
      setStatus("saved");
      close();
    } catch {
      setStatus("error");
    } finally {
      setPending(false);
    }
  };

  const handleMobileToggle = async (next: boolean) => {
    if (pending || !alertKnown) return;
    setStatus("idle");

    if (next) {
      setTarget(matchingAlert?.status === "PAUSED" && matchingAlert.targetPrice ? matchingAlert.targetPrice : "");
      setMobileOpen(true);
      return;
    }

    if (!matchingAlert || matchingAlert.status !== "ACTIVE") return;
    setPending(true);
    try {
      await updateStatus(matchingAlert, "PAUSED");
    } catch {
      setStatus("error");
    } finally {
      setPending(false);
    }
  };

  const openDesktopEditor = () => {
    setStatus("idle");
    setTarget("");
    setDesktopOpen(true);
  };

  const mobileEditor = mobileOpen && typeof document !== "undefined"
    ? createPortal(
        <div className="fixed inset-0 z-[10030] flex items-end bg-slate-950/40 sm:hidden" role="presentation">
          <button type="button" aria-label="Close price alert" className="absolute inset-0" onClick={() => { if (!pending) setMobileOpen(false); }} />
          <section role="dialog" aria-modal="true" aria-label={t("travel.account.hotelAlert.title")} className="relative z-10 w-full rounded-t-[22px] border border-b-0 border-slate-200 bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_36px_rgba(15,23,42,0.18)]">
            <header className="flex min-h-11 items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-950">{t("travel.account.hotelAlert.title")}</h2>
                <p className="mt-0.5 text-[13px] leading-[18px] text-slate-600">{t("travel.account.hotelAlert.body")}</p>
              </div>
              <button type="button" aria-label="Close price alert" disabled={pending} onClick={() => setMobileOpen(false)} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30 disabled:opacity-50">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>
            <label className="mt-4 block text-[13px] font-semibold text-slate-700">
              {t("travel.account.hotelAlert.target")} ({currency})
              <input autoFocus inputMode="decimal" value={target} onChange={(event) => { setTarget(event.target.value); setStatus("idle"); }} className="mt-1.5 block min-h-12 w-full rounded-[10px] border border-slate-300 px-3 text-base text-slate-950 outline-none focus:border-[#004BB8] focus:ring-2 focus:ring-[#004BB8]/20" />
            </label>
            {status === "duplicate" ? <p role="status" className="mt-3 text-[13px] font-semibold leading-[18px] text-amber-800">{t("travel.account.hotelAlert.duplicate")}</p> : null}
            {status === "error" ? <p role="alert" className="mt-3 text-[13px] font-semibold leading-[18px] text-red-700">{t("travel.account.hotelAlert.error")}</p> : null}
            <button disabled={pending} type="button" onClick={() => void saveTarget(() => setMobileOpen(false))} className="mt-4 min-h-12 w-full rounded-[10px] bg-[#004BB8] px-4 text-[15px] font-bold text-white transition hover:bg-[#003f9c] disabled:opacity-60">
              {pending ? t("loading") : t("travel.account.hotelAlert.save")}
            </button>
          </section>
        </div>,
        document.body,
      )
    : null;

  return (
    <section aria-label={t("travel.account.hotelAlert.title")} className="mb-4 sm:mb-5">
      <div className="flex min-h-12 items-center gap-2 rounded-xl border border-[#D8E1EC] bg-white px-3 sm:hidden">
        <Bell className="h-[17px] w-[17px] shrink-0 text-[#004BB8]" strokeWidth={2} aria-hidden="true" />
        <h2 className="min-w-0 flex-1 truncate text-[13px] font-bold leading-4 text-slate-950">{t("travel.account.hotelAlert.title")}</h2>
        <button
          type="button"
          role="switch"
          aria-label={t("travel.account.hotelAlert.title")}
          aria-checked={Boolean(isTracking)}
          aria-busy={pending || !alertKnown}
          disabled={pending || !alertKnown}
          onClick={() => void handleMobileToggle(!isTracking)}
          className={cn(
            "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30 disabled:opacity-55",
            isTracking ? "border-[#004BB8] bg-[#004BB8]" : "border-slate-300 bg-slate-200",
          )}
        >
          <span className={cn("inline-block h-6 w-6 rounded-full bg-white shadow-sm transition-transform", isTracking ? "translate-x-5" : "translate-x-0.5")} />
        </button>
      </div>

      <div className="hidden rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:block">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#004BB8]"><Bell className="h-4 w-4" aria-hidden="true" /></span>
            <div className="min-w-0"><h2 className="truncate text-base font-bold text-slate-950">{t("travel.account.hotelAlert.title")}</h2><p className="mt-1 text-sm text-slate-600">{t("travel.account.hotelAlert.body")}</p></div>
          </div>
          <button type="button" className="min-h-11 shrink-0 rounded-xl border-transparent bg-[#004BB8] px-4 text-sm font-bold text-white transition hover:bg-[#003f9c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30" onClick={openDesktopEditor}>{t("travel.account.hotelAlert.create")}</button>
        </div>
        {desktopOpen ? <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4"><label className="min-w-0 text-sm font-semibold text-slate-700">{t("travel.account.hotelAlert.target")} ({currency})<input autoFocus inputMode="decimal" value={target} onChange={(event) => { setTarget(event.target.value); setStatus("idle"); }} className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label><button disabled={pending} type="button" onClick={() => void saveTarget(() => setDesktopOpen(false))} className="min-h-11 rounded-lg bg-[#004BB8] px-4 text-sm font-bold text-white">{pending ? t("loading") : t("travel.account.hotelAlert.save")}</button><button type="button" disabled={pending} onClick={() => setDesktopOpen(false)} className="min-h-11 px-3 text-sm font-semibold text-slate-700">{t("cancel")}</button></div> : null}
        {status === "saved" ? <p role="status" className="mt-3 text-sm font-semibold text-emerald-700">{t("travel.account.hotelAlert.saved")}</p> : null}
        {status === "duplicate" ? <p role="status" className="mt-3 text-sm font-semibold text-amber-800">{t("travel.account.hotelAlert.duplicate")}</p> : null}
        {status === "error" ? <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{t("travel.account.hotelAlert.error")}</p> : null}
      </div>

      {mobileEditor}
    </section>
  );
}
