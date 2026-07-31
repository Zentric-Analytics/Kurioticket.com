"use client";

import { BedDouble, Car, Plane } from "lucide-react";
import { formatCurrency } from "@/lib/currency/formatCurrency";
import type { DealsPackageCandidate } from "@/lib/deals/dealsPackageCandidates";
import { getPrimaryCarOffer } from "@/lib/cars/carResults";

export function DealsPackageCard({ candidate, selected, t, onSelect }: { candidate: DealsPackageCandidate; selected: boolean; t: (key: string) => string; onSelect: () => void }) {
  const parts = [
    candidate.flight && { icon: Plane, label: t("deals.tripPlan.flight"), title: `${candidate.flight.airlineName} · ${candidate.flight.originAirport} → ${candidate.flight.destinationAirport}`, detail: candidate.flight.duration },
    candidate.hotel && { icon: BedDouble, label: t("deals.tripPlan.stay"), title: candidate.hotel.name, detail: candidate.hotel.neighbourhood || candidate.hotel.location },
    candidate.car && { icon: Car, label: t("deals.tripPlan.car"), title: candidate.car.modelName, detail: `${candidate.car.rentalCompanyName} · ${getPrimaryCarOffer(candidate.car)?.currency ?? ""}` },
  ].filter(Boolean) as Array<{ icon: typeof Plane; label: string; title: string; detail: string }>;
  return <article className={`rounded-3xl border bg-white p-5 shadow-sm sm:p-6 ${selected ? "border-[#004BB8] ring-2 ring-blue-100" : "border-[#D8E1EC]"}`}>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-[#004BB8]">{t(candidate.badgeKey)}</span><p className="mt-2 text-sm text-slate-600">{t(candidate.reasonKey!)}</p></div><div className="sm:text-right"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("deals.results.package.estimatedTotal")}</p>{candidate.estimatedTotal === null ? <p className="font-bold text-slate-700">{t("deals.results.priceUnavailable")}</p> : <p className="text-2xl font-extrabold text-[#004BB8]">{formatCurrency(candidate.estimatedTotal, candidate.displayCurrency, { maximumFractionDigits: 0 })}</p>}<p className="text-xs text-slate-500">{t("deals.results.package.providerCount").replace("{{count}}", String(candidate.providerCount))}</p></div></div>
    <div className="mt-5 grid gap-3 lg:grid-cols-3">{parts.map(({ icon: Icon, label, title, detail }) => <section key={label} className="rounded-2xl bg-slate-50 p-4"><p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-[#004BB8]"><Icon aria-hidden className="h-4 w-4" />{label}</p><h3 className="mt-2 font-extrabold text-slate-950">{title}</h3><p className="mt-1 text-sm text-slate-600">{detail}</p></section>)}</div>
    <div className="mt-5 border-t border-slate-200 pt-4 sm:flex sm:items-center sm:justify-between sm:gap-4"><p className="text-xs leading-5 text-slate-600">{t("deals.results.package.disclosure")}</p><button type="button" aria-pressed={selected} onClick={onSelect} className={`mt-3 inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-xl border px-5 font-bold sm:mt-0 sm:w-auto ${selected ? "border-[#004BB8] bg-[#004BB8] text-white" : "border-[#004BB8] text-[#004BB8]"}`}>{t(selected ? "deals.results.package.selected" : "deals.results.package.choose")}</button></div>
  </article>;
}
