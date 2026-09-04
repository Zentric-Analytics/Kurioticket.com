"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import type { HotelSearchParams, PublicHotelResult } from "@/lib/types";
import { buildHotelPriceAlertPayload } from "@/lib/price-alerts/hotelPriceAlerts";
import { getHotelPriceDetails } from "@/lib/hotels/hotelResultAvailability";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as en } from "@/lib/i18n/en";

export function HotelPriceAlertControl({ search, results }: { search: HotelSearchParams; results: PublicHotelResult[] }) {
  const router = useRouter();
  const { t: dictionary } = useLocale();
  const t = useCallback((key: string) => dictionary[key] ?? en[key] ?? key, [dictionary]);
  const currencies = useMemo(() => [...new Set(results.map(getHotelPriceDetails).filter((value): value is NonNullable<typeof value> => value !== null).map(({ currency }) => currency))], [results]);
  const [open, setOpen] = useState(false); const [target, setTarget] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "duplicate" | "error">("idle");
  const currency = currencies[0] ?? "";
  if (!currency) return null;
  const create = async () => {
    const value = Number(target);
    if (!/^\d+(?:\.\d{1,2})?$/.test(target.trim()) || !Number.isFinite(value) || value <= 0) { setStatus("error"); return; }
    setStatus("saving");
    const response = await fetch("/api/price-alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildHotelPriceAlertPayload(search, value, currency)) });
    if (response.status === 401) { router.push(`/auth/signin?callbackUrl=${encodeURIComponent(location.pathname + location.search)}`); return; }
    if (response.status === 409) { setStatus("duplicate"); return; }
    if (!response.ok) { setStatus("error"); return; }
    setStatus("saved"); setOpen(false);
  };
  return <section aria-label={t("travel.account.hotelAlert.title")} className="mb-4 rounded-xl border border-blue-100 bg-white p-3 shadow-[0_8px_24px_-22px_rgba(15,23,42,0.5)] sm:mb-5 sm:rounded-2xl sm:p-4 sm:shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5 sm:items-start sm:gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#004BB8] sm:h-9 sm:w-9"><Bell className="h-4 w-4" aria-hidden="true" /></span>
        <div className="min-w-0"><h2 className="truncate text-sm font-bold text-slate-950 sm:text-base">{t("travel.account.hotelAlert.title")}</h2><p className="mt-1 hidden text-sm text-slate-600 sm:block">{t("travel.account.hotelAlert.body")}</p></div>
      </div>
      <button type="button" className="min-h-9 shrink-0 rounded-lg border border-[#004BB8]/20 bg-blue-50 px-3 text-sm font-bold text-[#004BB8] transition hover:border-[#004BB8]/35 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30 sm:min-h-11 sm:rounded-xl sm:border-transparent sm:bg-[#004BB8] sm:px-4 sm:text-white sm:hover:bg-[#003f9c]" onClick={() => { setStatus("idle"); setOpen(true); }}>{t("travel.account.hotelAlert.create")}</button>
    </div>
    {open ? <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 border-t border-slate-100 pt-3 sm:mt-4 sm:flex sm:flex-wrap sm:gap-3 sm:pt-4"><label className="min-w-0 text-xs font-semibold text-slate-700 sm:text-sm">{t("travel.account.hotelAlert.target")} ({currency})<input autoFocus inputMode="decimal" value={target} onChange={(event) => { setTarget(event.target.value); setStatus("idle"); }} className="mt-1 block min-h-10 w-full rounded-lg border border-slate-300 px-3 sm:min-h-11" /></label><button disabled={status === "saving"} type="button" onClick={() => void create()} className="min-h-10 rounded-lg bg-[#004BB8] px-3 text-sm font-bold text-white sm:min-h-11 sm:px-4">{status === "saving" ? t("loading") : t("travel.account.hotelAlert.save")}</button><button type="button" onClick={() => setOpen(false)} className="min-h-9 justify-self-start px-1 text-sm font-semibold text-slate-700 sm:min-h-11 sm:px-3">{t("cancel")}</button></div> : null}
    {status === "saved" ? <p role="status" className="mt-3 text-sm font-semibold text-emerald-700">{t("travel.account.hotelAlert.saved")}</p> : null}
    {status === "duplicate" ? <p role="status" className="mt-3 text-sm font-semibold text-amber-800">{t("travel.account.hotelAlert.duplicate")}</p> : null}
    {status === "error" ? <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{t("travel.account.hotelAlert.error")}</p> : null}
  </section>;
}
