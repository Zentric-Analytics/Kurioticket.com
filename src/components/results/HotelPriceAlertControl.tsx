"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

import type { HotelSearchParams, PublicHotelResult } from "@/lib/types";
import { buildHotelPriceAlertPayload } from "@/lib/price-alerts/hotelPriceAlerts";
import { getHotelPriceDetails } from "@/lib/hotels/hotelResultAvailability";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as en } from "@/lib/i18n/en";

type AlertStatus = "ACTIVE" | "PAUSED" | "TRIGGERED" | "EXPIRED" | "DELETED";

type WebPriceAlert = {
  id: string;
  type: "FLIGHT" | "HOTEL" | "CAR";
  status: AlertStatus;
  query: Record<string, unknown>;
};

const text = (value: unknown) => String(value ?? "").trim().toLocaleLowerCase();

function matchesHotelSearch(alert: WebPriceAlert, search: HotelSearchParams) {
  if (alert.type !== "HOTEL") return false;
  return (
    text(alert.query.destination) === text(search.destination) &&
    text(alert.query.checkIn) === text(search.checkIn) &&
    text(alert.query.checkOut) === text(search.checkOut) &&
    Number(alert.query.guests) === Number(search.guests) &&
    Number(alert.query.rooms) === Number(search.rooms)
  );
}

function chooseMatchingAlert(alerts: WebPriceAlert[], search: HotelSearchParams) {
  const matches = alerts.filter((alert) => matchesHotelSearch(alert, search));
  return (
    matches.find((alert) => alert.status === "ACTIVE") ??
    matches.find((alert) => alert.status === "PAUSED")
  );
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
  const t = useCallback(
    (key: string) => dictionary[key] ?? en[key] ?? key,
    [dictionary],
  );
  const currencies = useMemo(
    () => [
      ...new Set(
        results
          .map(getHotelPriceDetails)
          .filter(
            (value): value is NonNullable<typeof value> => value !== null,
          )
          .map(({ currency }) => currency),
      ),
    ],
    [results],
  );
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "saving" | "saved" | "duplicate" | "error"
  >("loading");
  const [matchingAlert, setMatchingAlert] = useState<WebPriceAlert | undefined>();
  const [authRequired, setAuthRequired] = useState(false);
  const currency = currencies[0] ?? "";
  const tracking = matchingAlert?.status === "ACTIVE";
  const pending = status === "loading" || status === "saving";

  const requireSignIn = useCallback(() => {
    router.push(
      `/auth/signin?callbackUrl=${encodeURIComponent(location.pathname + location.search)}`,
    );
  }, [router]);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    void fetch("/api/price-alerts", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (response.status === 401) {
          setAuthRequired(true);
          setMatchingAlert(undefined);
          setStatus("idle");
          return;
        }
        if (!response.ok) throw new Error("load failed");
        const body = (await response.json()) as { alerts?: WebPriceAlert[] };
        setAuthRequired(false);
        setMatchingAlert(
          chooseMatchingAlert(Array.isArray(body.alerts) ? body.alerts : [], search),
        );
        setStatus("idle");
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") setStatus("idle");
      });
    return () => controller.abort();
  }, [search.checkIn, search.checkOut, search.destination, search.guests, search.rooms]);

  if (!currency) return null;

  const updateAlertStatus = async (
    alert: WebPriceAlert,
    nextStatus: "ACTIVE" | "PAUSED",
  ) => {
    setStatus("saving");
    const response = await fetch(
      `/api/price-alerts/${encodeURIComponent(alert.id)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      },
    );
    if (response.status === 401) {
      setStatus("idle");
      requireSignIn();
      return;
    }
    if (!response.ok) {
      setStatus("error");
      return;
    }
    const body = (await response.json()) as { alert?: WebPriceAlert };
    setMatchingAlert(body.alert ?? { ...alert, status: nextStatus });
    setStatus("idle");
  };

  const handleTrackingChange = async (next: boolean) => {
    if (pending) return;
    setStatus("idle");
    if (authRequired) {
      requireSignIn();
      return;
    }
    if (next) {
      if (matchingAlert?.status === "PAUSED") {
        await updateAlertStatus(matchingAlert, "ACTIVE");
        return;
      }
      if (matchingAlert?.status === "ACTIVE") return;
      setOpen(true);
      return;
    }
    if (matchingAlert?.status === "ACTIVE") {
      await updateAlertStatus(matchingAlert, "PAUSED");
    }
  };

  const create = async () => {
    const value = Number(target);
    if (
      !/^\d+(?:\.\d{1,2})?$/.test(target.trim()) ||
      !Number.isFinite(value) ||
      value <= 0
    ) {
      setStatus("error");
      return;
    }
    setStatus("saving");
    const response = await fetch("/api/price-alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        buildHotelPriceAlertPayload(search, value, currency),
      ),
    });
    if (response.status === 401) {
      setStatus("idle");
      requireSignIn();
      return;
    }
    const body = (await response.json().catch(() => ({}))) as {
      alert?: WebPriceAlert;
    };
    if (response.status === 409) {
      if (body.alert) setMatchingAlert(body.alert);
      setStatus("duplicate");
      return;
    }
    if (!response.ok) {
      setStatus("error");
      return;
    }
    if (body.alert) setMatchingAlert(body.alert);
    setStatus("saved");
    setOpen(false);
    setTarget("");
  };

  const editor = open ? (
    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 border-t border-slate-100 pt-3 sm:mt-4 sm:flex sm:flex-wrap sm:gap-3 sm:pt-4">
      <label className="min-w-0 text-xs font-semibold text-slate-700 sm:text-sm">
        {t("travel.account.hotelAlert.target")} ({currency})
        <input
          autoFocus
          inputMode="decimal"
          value={target}
          onChange={(event) => {
            setTarget(event.target.value);
            setStatus("idle");
          }}
          className="mt-1 block min-h-10 w-full rounded-lg border border-slate-300 px-3 sm:min-h-11"
        />
      </label>
      <button
        disabled={status === "saving"}
        type="button"
        onClick={() => void create()}
        className="min-h-10 rounded-lg bg-[#004BB8] px-3 text-sm font-bold text-white disabled:opacity-60 sm:min-h-11 sm:px-4"
      >
        {status === "saving" ? t("loading") : t("travel.account.hotelAlert.save")}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setStatus("idle");
        }}
        className="min-h-9 justify-self-start px-1 text-sm font-semibold text-slate-700 sm:min-h-11 sm:px-3"
      >
        {t("cancel")}
      </button>
    </div>
  ) : null;

  return (
    <section
      aria-label={t("travel.account.hotelAlert.title")}
      className="mb-4 rounded-xl border border-blue-100 bg-white p-3 shadow-[0_8px_24px_-22px_rgba(15,23,42,0.5)] sm:mb-5 sm:rounded-2xl sm:p-4 sm:shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 sm:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <Bell
            className="h-[17px] w-[17px] shrink-0 text-[#004BB8]"
            strokeWidth={2}
            aria-hidden="true"
          />
          <h2 className="truncate text-[13px] font-bold leading-4 text-slate-950">
            {t("travel.account.hotelAlert.title")}
          </h2>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={tracking}
          aria-label={t("travel.account.hotelAlert.title")}
          disabled={pending}
          onClick={() => void handleTrackingChange(!tracking)}
          className={`focus-ring relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors disabled:cursor-wait disabled:opacity-60 ${
            tracking
              ? "border-[#004BB8] bg-[#004BB8]"
              : "border-slate-300 bg-slate-200"
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
              tracking ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      <div className="hidden items-center justify-between gap-3 sm:flex">
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
          className="min-h-9 shrink-0 rounded-lg border border-[#004BB8]/20 bg-blue-50 px-3 text-sm font-bold text-[#004BB8] transition hover:border-[#004BB8]/35 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30 sm:min-h-11 sm:rounded-xl sm:border-transparent sm:bg-[#004BB8] sm:px-4 sm:text-white sm:hover:bg-[#003f9c]"
          onClick={() => {
            setStatus("idle");
            setOpen(true);
          }}
        >
          {t("travel.account.hotelAlert.create")}
        </button>
      </div>

      {editor}
      {status === "saved" ? (
        <p role="status" className="mt-3 text-sm font-semibold text-emerald-700">
          {t("travel.account.hotelAlert.saved")}
        </p>
      ) : null}
      {status === "duplicate" ? (
        <p role="status" className="mt-3 text-sm font-semibold text-amber-800">
          {t("travel.account.hotelAlert.duplicate")}
        </p>
      ) : null}
      {status === "error" ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-red-700">
          {t("travel.account.hotelAlert.error")}
        </p>
      ) : null}
    </section>
  );
}
