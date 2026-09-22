"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";

import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { formatCurrency, formatDisplayPrice } from "@/lib/currency/formatCurrency";
import {
  buildHotelPriceAlertPayload,
  HOTEL_ALERT_DEFAULT_DROP_PERCENT,
  HOTEL_ALERT_MAX_DROP_PERCENT,
  HOTEL_ALERT_MIN_DROP_PERCENT,
  hotelAlertDesiredTotal,
  hotelAlertDropPercentForTarget,
  hotelAlertPriceBasis,
  hotelPriceAlertMatchesSearch,
  matchingHotelPriceAlert,
  type HotelPriceAlertRecord,
} from "@/lib/price-alerts/hotelPriceAlerts";
import { translations as en } from "@/lib/i18n/en";
import type { HotelSearchParams, PublicHotelResult } from "@/lib/types";
import { cn } from "@/lib/utils";

type Status = "idle" | "saving" | "saved" | "duplicate" | "error";
type PreservedPausedTarget = { id: string; target: number; currency: string };

function replaceAlert(alerts: HotelPriceAlertRecord[], alert: HotelPriceAlertRecord) {
  return [...alerts.filter((item) => item.id !== alert.id), alert];
}

function formatDropPercent(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function HotelPriceAlertControl({
  search,
  results,
}: {
  search: HotelSearchParams;
  results: PublicHotelResult[];
}) {
  const router = useRouter();
  const { t: dictionary } = useLocale();
  const { selectedOption } = useRegion();
  const currencyRates = useCurrencyRates();
  const t = useCallback(
    (key: string) => dictionary[key] ?? en[key] ?? key,
    [dictionary],
  );

  const priceBasis = useMemo(
    () =>
      hotelAlertPriceBasis(
        results,
        selectedOption.currency,
        currencyRates.rates,
        currencyRates.isFallback,
      ),
    [currencyRates.isFallback, currencyRates.rates, results, selectedOption.currency],
  );

  const currentTotal = priceBasis?.amount ?? null;
  const displayCurrency = priceBasis?.currency ?? selectedOption.currency;
  const providerCurrentTotal = priceBasis?.providerAmount ?? null;
  const providerCurrency = priceBasis?.providerCurrency ?? null;

  const [alerts, setAlerts] = useState<HotelPriceAlertRecord[]>([]);
  const [alertKnown, setAlertKnown] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [dropPercent, setDropPercent] = useState(HOTEL_ALERT_DEFAULT_DROP_PERCENT);
  const [preservedPausedTarget, setPreservedPausedTarget] =
    useState<PreservedPausedTarget | null>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status>("idle");

  const matchingAlert = useMemo(
    () => matchingHotelPriceAlert(alerts, search),
    [alerts, search],
  );
  const isTracking = matchingAlert?.status === "ACTIVE";

  useEffect(() => {
    const controller = new AbortController();
    setAlertKnown(false);
    setAuthenticated(null);
    void fetch("/api/price-alerts", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 401) {
          setAlerts([]);
          setAuthenticated(false);
          setAlertKnown(true);
          return;
        }
        if (!response.ok) throw new Error("load failed");
        const body = (await response.json()) as {
          alerts?: HotelPriceAlertRecord[];
        };
        setAlerts(Array.isArray(body.alerts) ? body.alerts : []);
        setAuthenticated(true);
        setAlertKnown(true);
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") {
          setAlertKnown(true);
          setAuthenticated(null);
        }
      });
    return () => controller.abort();
  }, [
    search.checkIn,
    search.checkOut,
    search.destination,
    search.guests,
    search.rooms,
  ]);

  if (
    currentTotal === null ||
    providerCurrentTotal === null ||
    !providerCurrency
  ) {
    return null;
  }

  const requireSignIn = () => {
    router.push(
      `/auth/signin?callbackUrl=${encodeURIComponent(
        location.pathname + location.search,
      )}`,
    );
  };

  const updateStatus = async (
    alert: HotelPriceAlertRecord,
    nextStatus: "ACTIVE" | "PAUSED",
  ) => {
    const response = await fetch(
      `/api/price-alerts/${encodeURIComponent(alert.id)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      },
    );
    if (response.status === 401) {
      setAuthenticated(false);
      requireSignIn();
      return null;
    }
    if (!response.ok) throw new Error("update failed");
    const body = (await response.json()) as { alert: HotelPriceAlertRecord };
    setAlerts((current) => replaceAlert(current, body.alert));
    return body.alert;
  };

  const openEditor = (surface: "mobile" | "desktop") => {
    if (pending || !alertKnown) return;
    if (authenticated === false) {
      requireSignIn();
      return;
    }

    const existingTarget =
      matchingAlert?.targetPrice != null &&
      matchingAlert.currency?.toUpperCase() === providerCurrency
        ? Number(matchingAlert.targetPrice)
        : null;
    const existingDropPercent =
      existingTarget !== null &&
      Number.isFinite(existingTarget) &&
      existingTarget > 0
        ? (1 - existingTarget / providerCurrentTotal) * 100
        : null;
    const preserveExistingTarget =
      matchingAlert?.status === "PAUSED" &&
      existingTarget !== null &&
      existingDropPercent !== null &&
      existingDropPercent >= HOTEL_ALERT_MIN_DROP_PERCENT &&
      existingDropPercent <= HOTEL_ALERT_MAX_DROP_PERCENT;

    setPreservedPausedTarget(
      preserveExistingTarget
        ? {
            id: matchingAlert.id,
            target: existingTarget,
            currency: providerCurrency,
          }
        : null,
    );
    setDropPercent(
      preserveExistingTarget && existingDropPercent !== null
        ? existingDropPercent
        : existingTarget !== null && Number.isFinite(existingTarget)
          ? hotelAlertDropPercentForTarget(
              providerCurrentTotal,
              existingTarget,
            )
          : HOTEL_ALERT_DEFAULT_DROP_PERCENT,
    );
    setStatus("idle");
    if (surface === "mobile") setMobileOpen(true);
    else setDesktopOpen(true);
  };

  const closeEditor = (surface: "mobile" | "desktop") => {
    if (pending) return;
    if (surface === "mobile") setMobileOpen(false);
    else setDesktopOpen(false);
    setPreservedPausedTarget(null);
    setStatus("idle");
  };

  const sliderProviderTarget = hotelAlertDesiredTotal(
    providerCurrentTotal,
    dropPercent,
    providerCurrency,
  );
  const alertTarget =
    preservedPausedTarget?.currency === providerCurrency
      ? preservedPausedTarget.target
      : sliderProviderTarget;

  const sliderDisplayTarget = hotelAlertDesiredTotal(
    currentTotal,
    dropPercent,
    displayCurrency,
  );
  const preservedDisplayTarget =
    preservedPausedTarget?.currency === providerCurrency
      ? formatDisplayPrice({
          amount: preservedPausedTarget.target,
          sourceCurrency: providerCurrency,
          displayCurrency,
          convertSourceEstimate: true,
          rates: currencyRates.rates,
          isFallbackRate: currencyRates.isFallback,
        }).amount
      : null;
  const desiredTotal =
    preservedPausedTarget?.currency === providerCurrency
      ? preservedDisplayTarget
      : sliderDisplayTarget;
  const dropAmount =
    desiredTotal === null ? 0 : Math.max(0, currentTotal - desiredTotal);

  const saveTarget = async (close: () => void) => {
    if (
      alertTarget === null ||
      !Number.isFinite(alertTarget) ||
      alertTarget <= 0 ||
      pending
    ) {
      setStatus("error");
      return;
    }

    setPending(true);
    setStatus("saving");
    try {
      const samePausedTarget =
        (preservedPausedTarget
          ? alerts.find(
              (alert) =>
                alert.id === preservedPausedTarget.id &&
                alert.status === "PAUSED" &&
                hotelPriceAlertMatchesSearch(alert, search) &&
                alert.currency?.toUpperCase() ===
                  preservedPausedTarget.currency,
            )
          : undefined) ??
        alerts.find(
          (alert) =>
            alert.status === "PAUSED" &&
            hotelPriceAlertMatchesSearch(alert, search) &&
            Number(alert.targetPrice) === alertTarget &&
            alert.currency?.toUpperCase() === providerCurrency,
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
        body: JSON.stringify(
          buildHotelPriceAlertPayload(
            search,
            alertTarget,
            providerCurrency,
          ),
        ),
      });
      if (response.status === 401) {
        setAuthenticated(false);
        requireSignIn();
        return;
      }
      const body = (await response.json().catch(() => ({}))) as {
        alert?: HotelPriceAlertRecord;
      };
      if (response.status === 409) {
        if (body.alert) {
          setAlerts((current) => replaceAlert(current, body.alert!));
        }
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

  const handleToggle = async (
    next: boolean,
    surface: "mobile" | "desktop",
  ) => {
    if (pending || !alertKnown) return;
    setStatus("idle");

    if (next) {
      if (isTracking) return;
      openEditor(surface);
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

  const formatTotal = (amount: number) =>
    formatCurrency(amount, displayCurrency);
  const editor = (surface: "mobile" | "desktop") => (
    <>
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2">
        <p className="text-[12px] font-medium leading-4 text-slate-500">
          Current total
        </p>
        <p className="mt-0.5 text-[21px] font-bold leading-[26px] text-slate-950 tabular-nums">
          {formatTotal(currentTotal)}
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[15px] font-semibold leading-5 text-slate-950">
            Price drop
          </span>
          <strong className="text-[15px] font-bold leading-5 text-[#004BB8]">
            {formatDropPercent(dropPercent)}%
          </strong>
        </div>
        <input
          type="range"
          min={HOTEL_ALERT_MIN_DROP_PERCENT}
          max={HOTEL_ALERT_MAX_DROP_PERCENT}
          step={1}
          value={dropPercent}
          aria-label="Price drop"
          onChange={(event) => {
            setPreservedPausedTarget(null);
            setDropPercent(Number(event.target.value));
            setStatus("idle");
          }}
          className="mt-2 h-2 w-full cursor-pointer accent-[#004BB8]"
        />
        <div className="mt-1 flex justify-between text-[11px] leading-[15px] text-slate-500">
          <span>1%</span>
          <span>50%</span>
        </div>
      </div>

      <div className="grid min-h-[58px] grid-cols-2 gap-3 border-y border-slate-200 py-2">
        <div>
          <p className="text-[12px] font-medium leading-4 text-slate-500">
            Drops by
          </p>
          <p className="mt-0.5 text-[15px] font-bold leading-5 text-slate-950 tabular-nums">
            {formatTotal(dropAmount)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[12px] font-medium leading-4 text-slate-500">
            Target total
          </p>
          <p className="mt-0.5 text-[15px] font-bold leading-5 text-slate-950 tabular-nums">
            {desiredTotal === null ? "—" : formatTotal(desiredTotal)}
          </p>
        </div>
      </div>

      {status === "duplicate" ? (
        <p role="status" className="text-[12px] font-medium leading-[18px] text-amber-800">
          {t("travel.account.hotelAlert.duplicate")}
        </p>
      ) : null}
      {status === "error" ? (
        <p role="alert" className="text-[12px] font-medium leading-[18px] text-red-700">
          {t("travel.account.hotelAlert.error")}
        </p>
      ) : null}

      <button
        disabled={pending || alertTarget === null}
        type="button"
        onClick={() =>
          void saveTarget(() => closeEditor(surface))
        }
        className="min-h-[46px] w-full rounded-[10px] bg-[#004BB8] px-4 text-[15px] font-bold leading-5 text-white transition hover:bg-[#003B91] disabled:opacity-45"
      >
        {pending ? "Creating…" : "Create alert"}
      </button>
    </>
  );

  const mobileEditor =
    mobileOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[10030] flex items-end bg-slate-950/45 sm:hidden"
            role="presentation"
          >
            <button
              type="button"
              aria-label="Close price alert"
              className="absolute inset-0"
              onClick={() => closeEditor("mobile")}
            />
            <section
              role="dialog"
              aria-modal="true"
              aria-label={t("travel.account.hotelAlert.title")}
              className="relative z-10 max-h-[92svh] w-full overflow-y-auto rounded-t-[22px] border border-b-0 border-slate-200 bg-white px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_36px_rgba(15,23,42,0.18)]"
            >
              <header className="flex items-start gap-2.5">
                <div className="min-w-0 flex-1 pt-0.5">
                  <h2 className="text-[20px] font-bold leading-[26px] text-slate-950">
                    {t("travel.account.hotelAlert.title")}
                  </h2>
                  <p className="mt-0.5 text-[13px] leading-[19px] text-slate-600">
                    {t("travel.account.hotelAlert.body")}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close price alert"
                  disabled={pending}
                  onClick={() => closeEditor("mobile")}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  <X className="h-[21px] w-[21px]" strokeWidth={1.5} aria-hidden="true" />
                </button>
              </header>
              <div className="mt-3 grid gap-[13px]">
                {editor("mobile")}
              </div>
            </section>
          </div>,
          document.body,
        )
      : null;

  const compactDisabled =
    pending || !alertKnown || (authenticated === null && !alertKnown);

  return (
    <section
      aria-label={t("travel.account.hotelAlert.title")}
      className="mb-3 sm:mb-5"
    >
      <div className="flex min-h-12 items-center gap-2 rounded-xl border border-[#D8E1EC] bg-[#F0F5FC] px-3 sm:hidden">
        <Bell
          className="h-[17px] w-[17px] shrink-0 text-[#004BB8]"
          strokeWidth={2}
          aria-hidden="true"
        />
        <h2 className="min-w-0 flex-1 truncate text-[12.5px] font-bold leading-4 text-[#071A48]">
          {t("travel.account.hotelAlert.title")}
        </h2>
        <button
          type="button"
          role="switch"
          aria-label={t("travel.account.hotelAlert.title")}
          aria-checked={Boolean(isTracking)}
          aria-busy={pending || !alertKnown}
          disabled={compactDisabled}
          onClick={() =>
            void handleToggle(!isTracking, "mobile")
          }
          className={cn(
            "relative inline-flex h-[28px] w-[49px] shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30 disabled:opacity-55",
            isTracking
              ? "border-[#004BB8] bg-[#004BB8]"
              : "border-slate-300 bg-slate-300",
          )}
        >
          <span
            className={cn(
              "inline-block h-6 w-6 rounded-full bg-white shadow-sm transition-transform",
              isTracking ? "translate-x-[21px]" : "translate-x-0.5",
            )}
          />
        </button>
      </div>

      <div className="hidden rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:block">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#004BB8]">
              <Bell className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-slate-950">
                {t("travel.account.hotelAlert.title")}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {t("travel.account.hotelAlert.body")}
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(isTracking)}
            disabled={pending || !alertKnown}
            onClick={() =>
              void handleToggle(!isTracking, "desktop")
            }
            className={cn(
              "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors",
              isTracking
                ? "border-[#004BB8] bg-[#004BB8]"
                : "border-slate-300 bg-slate-200",
            )}
          >
            <span
              className={cn(
                "inline-block h-6 w-6 rounded-full bg-white shadow-sm transition-transform",
                isTracking ? "translate-x-5" : "translate-x-0.5",
              )}
            />
          </button>
        </div>

        {desktopOpen ? (
          <div className="mt-4 grid max-w-xl gap-[13px] border-t border-slate-100 pt-4">
            {editor("desktop")}
            <button
              type="button"
              disabled={pending}
              onClick={() => closeEditor("desktop")}
              className="min-h-10 justify-self-start px-2 text-sm font-semibold text-slate-700"
            >
              {t("cancel")}
            </button>
          </div>
        ) : null}
        {status === "saved" ? (
          <p role="status" className="mt-3 text-sm font-semibold text-emerald-700">
            {t("travel.account.hotelAlert.saved")}
          </p>
        ) : null}
      </div>

      {mobileEditor}
    </section>
  );
}
