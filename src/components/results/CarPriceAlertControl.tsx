"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import type { CarSearchParams, NormalizedCarResult } from "@/lib/cars/types";
import { buildCarPriceAlertPayload } from "@/lib/price-alerts/carPriceAlerts";
import { supportedCurrencies } from "@/lib/region/supportedRegions";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as en } from "@/lib/i18n/en";

const supported = new Set(supportedCurrencies.map(({ code }) => code));

export function CarPriceAlertControl({ search, results }: { search: CarSearchParams; results: NormalizedCarResult[] }) {
  const router = useRouter();
  const { t: dictionary } = useLocale();
  const t = useCallback((key: string) => dictionary[key] ?? en[key] ?? key, [dictionary]);
  const currency = useMemo(() => results.flatMap(({ offers }) => offers).map(({ currency }) => currency.trim().toUpperCase()).find((code) => supported.has(code)) ?? "", [results]);
  const [open, setOpen] = useState(false), [target, setTarget] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "duplicate" | "error">("idle");
  if (!currency) return null;
  const create = async () => {
    const value = Number(target);
    if (!/^\d+(?:\.\d{1,2})?$/.test(target.trim()) || !Number.isFinite(value) || value <= 0) { setStatus("error"); return; }
    setStatus("saving");
    const response = await fetch("/api/price-alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildCarPriceAlertPayload(search, value, currency)) });
    if (response.status === 401) { router.push(`/auth/signin?callbackUrl=${encodeURIComponent(location.pathname + location.search)}`); return; }
    if (response.status === 409) { setStatus("duplicate"); return; }
    if (!response.ok) { setStatus("error"); return; }
    setStatus("saved"); setOpen(false);
  };
  return <section aria-label={t("travel.account.carAlert.title")} className="rounded-xl border border-blue-100 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
    <div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2.5"><span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#004BB8]"><Bell className="h-4 w-4" aria-hidden="true" /></span><div className="min-w-0"><h2 className="truncate text-sm font-bold text-slate-950 sm:text-base">{t("travel.account.carAlert.title")}</h2><p className="mt-1 hidden text-sm text-slate-600 sm:block">{t("travel.account.carAlert.body")}</p></div></div><button type="button" className="min-h-9 shrink-0 rounded-lg bg-[#004BB8] px-3 text-sm font-bold text-white" onClick={() => { setStatus("idle"); setOpen(true); }}>{t("travel.account.carAlert.create")}</button></div>
    {open ? <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3"><label className="min-w-0 flex-1 text-sm font-semibold text-slate-700">{t("travel.account.carAlert.target")} ({currency})<input autoFocus inputMode="decimal" value={target} onChange={(event) => { setTarget(event.target.value); setStatus("idle"); }} className="mt-1 block min-h-10 w-full rounded-lg border border-slate-300 px-3" /></label><button disabled={status === "saving"} onClick={() => void create()} className="min-h-10 rounded-lg bg-[#004BB8] px-4 text-sm font-bold text-white">{status === "saving" ? t("loading") : t("travel.account.carAlert.save")}</button><button onClick={() => setOpen(false)} className="min-h-10 px-2 text-sm font-semibold">{t("cancel")}</button></div> : null}
    {status === "saved" ? <p role="status" className="mt-3 text-sm font-semibold text-emerald-700">{t("travel.account.carAlert.saved")}</p> : null}{status === "duplicate" ? <p role="status" className="mt-3 text-sm font-semibold text-amber-800">{t("travel.account.carAlert.duplicate")}</p> : null}{status === "error" ? <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{t("travel.account.carAlert.error")}</p> : null}
  </section>;
}
