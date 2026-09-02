"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { HotelSearchParams, PublicHotelResult } from "@/lib/types";
import { buildHotelPriceAlertPayload } from "@/lib/price-alerts/hotelPriceAlerts";
import { getHotelPriceDetails } from "@/lib/hotels/hotelResultAvailability";

export function HotelPriceAlertControl({ search, results }: { search: HotelSearchParams; results: PublicHotelResult[] }) {
  const router = useRouter();
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
  return <section aria-label="Hotel price alert" className="mb-5 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-slate-950">Track this stay price</h2><p className="mt-1 text-sm text-slate-600">Get notified when this complete stay search reaches your target total.</p></div><button type="button" className="min-h-11 rounded-xl bg-[#004BB8] px-4 font-bold text-white" onClick={() => { setStatus("idle"); setOpen(true); }}>Create price alert</button></div>
    {open ? <div className="mt-4 flex flex-wrap items-end gap-3"><label className="text-sm font-semibold text-slate-700">Target total ({currency})<input autoFocus inputMode="decimal" value={target} onChange={(event) => { setTarget(event.target.value); setStatus("idle"); }} className="mt-1 block min-h-11 rounded-lg border border-slate-300 px-3" /></label><button disabled={status === "saving"} type="button" onClick={() => void create()} className="min-h-11 rounded-lg bg-[#004BB8] px-4 font-bold text-white">{status === "saving" ? "Creating…" : "Save alert"}</button><button type="button" onClick={() => setOpen(false)} className="min-h-11 px-3 font-semibold text-slate-700">Cancel</button></div> : null}
    {status === "saved" ? <p role="status" className="mt-3 text-sm font-semibold text-emerald-700">Hotel price alert created.</p> : null}
    {status === "duplicate" ? <p role="status" className="mt-3 text-sm font-semibold text-amber-800">This Hotel alert already exists. Manage it in Price alerts.</p> : null}
    {status === "error" ? <p role="alert" className="mt-3 text-sm font-semibold text-red-700">Enter a valid target total and try again.</p> : null}
  </section>;
}
