"use client";

import { BriefcaseBusiness, CarFront, Check, DoorOpen, Fuel, Gauge, MapPin, Snowflake, Users } from "lucide-react";
import { CarResultImage } from "@/components/results/CarResultImage";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { buildCarDetailsHref, calculateRentalDays, getPrimaryCarOffer } from "@/lib/cars/carResults";
import type { CarSearchParams, NormalizedCarResult } from "@/lib/cars/types";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import { validateDealsCarDetailsPath } from "@/lib/deals/dealsTripPlan";

export type DealsCarPreviewCardProps = { car: NormalizedCarResult; badgeKey: string; locale: string; search: CarSearchParams; t: (key: string) => string; selected: boolean; onSelect: () => void };
const interpolate = (value: string, values: Record<string, string | number>) => Object.entries(values).reduce((result, [key, replacement]) => result.replaceAll(`{{${key}}}`, String(replacement)), value);

export function DealsCarPreviewCard({ car, badgeKey, search, t, selected, onSelect }: DealsCarPreviewCardProps) {
  const { selectedOption } = useRegion(); const rates = useCurrencyRates(); const offer = getPrimaryCarOffer(car);
  const detailsPath = car.id.trim() ? validateDealsCarDetailsPath(buildCarDetailsHref(car.id, search)) : null;
  const selectable = Boolean(offer && Number.isFinite(offer.totalPrice) && offer.totalPrice > 0 && offer.currency.trim() && detailsPath);
  if (!offer) return null;
  const display = (amount: number) => formatDisplayPrice({ amount, sourceCurrency: offer.currency, displayCurrency: selectedOption.currency, convertSourceEstimate: true, maximumFractionDigits: 0, rates: rates.rates, isFallbackRate: rates.isFallback });
  const total = display(offer.totalPrice); const daily = display(offer.pricePerDay); const days = calculateRentalDays(search.pickupDate, search.dropoffDate);
  const specs = [[Users, interpolate(t("deals.results.car.passengers"), { count: car.passengers })], [BriefcaseBusiness, interpolate(t("deals.results.car.bags"), { count: car.bags })], [DoorOpen, interpolate(t("deals.results.car.doors"), { count: car.doors })], [CarFront, t(`deals.results.car.transmission.${car.transmission}`)]] as const;
  return <article className={`flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm ${selected ? "border-[#004BB8] ring-2 ring-blue-100" : "border-[#D8E1EC]"}`}>
    <div className="relative aspect-[16/9] bg-slate-100"><CarResultImage imageUrl={car.imageUrl} imageAlt={car.imageAlt} modelName={car.modelName} category={car.category} /></div>
    <div className="flex flex-1 flex-col p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-wide text-[#004BB8]">{car.categoryLabel}</p><h3 className="text-xl font-extrabold text-slate-950">{car.modelName}{car.orSimilar ? ` ${t("deals.results.car.orSimilar")}` : ""}</h3></div><span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-[#004BB8]">{t(badgeKey)}</span></div>
    <p className="mt-2 flex gap-1 text-sm text-slate-700"><MapPin aria-hidden size={17} className="shrink-0 text-[#004BB8]" />{car.pickupLocation} · {t(`deals.results.car.pickup.${car.pickupType}`)}{car.shuttleRequired ? ` · ${t("deals.results.car.shuttle")}` : ""}</p>
    <ul className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">{specs.map(([Icon, label]) => <li key={label} className="flex gap-1"><Icon aria-hidden size={15} />{label}</li>)}{car.airConditioning && <li className="flex gap-1"><Snowflake aria-hidden size={15} />{t("deals.results.car.airConditioning")}</li>}</ul>
    <div className="mt-3 flex flex-wrap gap-1 text-xs"><span className="rounded bg-slate-100 px-2 py-1"><Gauge aria-hidden className="inline" size={14} /> {t(car.mileagePolicy === "unlimited" ? "deals.results.car.unlimitedMileage" : "deals.results.car.limitedMileage")}</span><span className="rounded bg-slate-100 px-2 py-1"><Fuel aria-hidden className="inline" size={14} /> {t(`deals.results.car.fuel.${car.fuelPolicy}`)}</span>{offer.freeCancellation && <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-800"><Check aria-hidden className="inline" size={14} /> {t("deals.results.car.freeCancellation")}</span>}{offer.payAtPickup && <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-800"><Check aria-hidden className="inline" size={14} /> {t("deals.results.car.payAtPickup")}</span>}</div>
    <div className="mt-auto pt-4"><p className="text-2xl font-extrabold text-[#004BB8]" dir="ltr" aria-label={total.ariaLabel}>{total.formatted}</p><p className="text-xs text-slate-600">{interpolate(t("deals.results.car.perDayAndDays"), { price: daily.formatted, count: days })} · {t(offer.taxesAndFeesIncluded ? "deals.results.car.taxesIncluded" : "deals.results.car.taxesUnknown")}</p><button type="button" aria-pressed={selected} disabled={!selectable} aria-label={t(selected ? "deals.results.car.selectedAccessible" : selectable ? "deals.results.car.chooseAccessible" : "deals.results.car.unsafeSelection")} onClick={onSelect} className="mt-3 min-h-11 w-full rounded-xl bg-[#004BB8] px-4 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700">{t(selected ? "deals.results.car.selected" : "deals.results.car.choose")}</button></div></div>
  </article>;
}
