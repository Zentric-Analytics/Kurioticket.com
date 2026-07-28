"use client";

import Link from "next/link";
import { Award, BriefcaseBusiness, CarFront, Check, DoorOpen, Fuel, Gauge, MapPin, Snowflake, Star, Tag, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { CarResultImage } from "@/components/results/CarResultImage";
import type { CarResultBadge } from "@/lib/cars/carResults";
import { getPrimaryCarOffer } from "@/lib/cars/carResults";
import type { NormalizedCarResult } from "@/lib/cars/types";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";

const title = (value: string) => value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const carResultBadgeIcons: Record<CarResultBadge, LucideIcon> = {
  "Best value": Award,
  Cheapest: Tag,
  "Top rated": Star,
};

export function CarResultCard({ car, badge, detailsHref }: { car: NormalizedCarResult; badge?: CarResultBadge; detailsHref: string }) {
  const { selectedOption } = useRegion();
  const currencyRates = useCurrencyRates();
  const offer = getPrimaryCarOffer(car);
  if (!offer) return null;
  const BadgeIcon = badge ? carResultBadgeIcons[badge] : null;
  const dailyDisplayPrice = formatDisplayPrice({
    amount: offer.pricePerDay,
    sourceCurrency: offer.currency,
    displayCurrency: selectedOption.currency,
    convertSourceEstimate: true,
    maximumFractionDigits: 0,
    rates: currencyRates.rates,
    isFallbackRate: currencyRates.isFallback,
  });
  const totalDisplayPrice = formatDisplayPrice({
    amount: offer.totalPrice,
    sourceCurrency: offer.currency,
    displayCurrency: selectedOption.currency,
    convertSourceEstimate: true,
    maximumFractionDigits: 0,
    rates: currencyRates.rates,
    isFallbackRate: currencyRates.isFallback,
  });
  const specifications: Array<[LucideIcon, string]> = [
    [Users, `${car.passengers} passengers`],
    [BriefcaseBusiness, `${car.bags} bags`],
    [DoorOpen, `${car.doors} doors`],
    [CarFront, title(car.transmission)],
  ];
  if (car.airConditioning) specifications.push([Snowflake, "Air conditioning"]);

  return (
    <article className="relative w-full overflow-hidden rounded-2xl border border-[#D8E1EC] bg-white shadow-[0_12px_30px_-24px_rgba(15,23,42,0.55)] transition duration-200 hover:-translate-y-0.5 hover:border-[#CBD6E2] hover:shadow-[0_18px_38px_-26px_rgba(15,23,42,0.42)]">
      <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:grid-cols-[250px_minmax(0,1fr)] lg:grid-cols-[250px_minmax(0,1fr)_205px] xl:grid-cols-[270px_minmax(0,1fr)_205px]">
        <div data-region="image" className="col-span-2 row-start-1 flex items-center border-b border-[#E2E8F0] bg-slate-50 md:col-span-1 md:col-start-1 md:row-span-2 md:row-start-1 md:border-b-0 md:border-e md:p-2.5">
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 md:rounded-xl">
            <CarResultImage imageUrl={car.imageUrl} imageAlt={car.imageAlt} modelName={car.modelName} category={car.category} />
          </div>
        </div>

        <div data-region="heading" className="col-span-2 row-start-2 min-w-0 px-3.5 py-2.5 md:col-span-1 md:col-start-2 md:row-start-1 md:px-4 md:pb-1 md:pt-3">
          <header className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#004BB8]">{car.categoryLabel}</p>
              <h2 className="mt-0.5 break-words text-[22px] font-extrabold leading-tight text-[#102A43]">
                {car.modelName}
              </h2>
            </div>
            {badge && BadgeIcon && (
              <span className="inline-flex min-h-6 shrink-0 items-center gap-1 rounded-md bg-[#EAF2FB] px-2 py-0.5 text-xs font-semibold text-[#004BB8]">
                <BadgeIcon size={13} aria-hidden="true" />
                {badge}
              </span>
            )}
          </header>

          <p className="mt-1 flex min-w-0 items-center gap-2 text-sm text-slate-600">
            <MapPin
              size={16}
              className="shrink-0 text-[#004BB8]"
              aria-hidden="true"
            />
            <span className="min-w-0 whitespace-normal md:whitespace-nowrap">
              <strong className="font-semibold text-slate-700">
                {title(car.pickupType)}
              </strong>
              {" · "}
              {car.pickupLocation}
              {car.shuttleRequired ? " · Shuttle required" : ""}
            </span>
          </p>
        </div>

        <div data-region="details" className="col-start-1 row-start-3 min-w-0 border-t border-[#E2E8F0] px-3 py-3 md:col-start-2 md:row-start-2 md:border-t-0 md:px-4 md:pb-3 md:pt-1">
          <ul className="grid grid-cols-1 gap-y-1.5 text-[12px] font-medium leading-4 text-slate-600 md:flex md:flex-wrap md:gap-x-3 md:gap-y-1.5 md:text-sm">
            {specifications.map(([Icon, label]) => <li key={label} className="flex min-w-0 items-center gap-1.5"><Icon size={16} className="shrink-0 text-slate-500" aria-hidden="true" /><span className="min-w-0">{label}</span></li>)}
          </ul>

          <div className="mt-2 flex min-w-0 flex-col items-start gap-1.5 md:flex-row md:flex-wrap">
            <span className="inline-flex min-h-6 max-w-full items-start gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold leading-4 text-slate-700 md:items-center md:px-2 md:text-xs"><Gauge size={13} className="mt-0.5 shrink-0 md:mt-0" aria-hidden="true" /><span className="min-w-0">{car.mileagePolicy === "unlimited" ? "Unlimited mileage" : `${car.limitedMileageKm} km included`}</span></span>
            <span className="inline-flex min-h-6 max-w-full items-start gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold leading-4 text-slate-700 md:items-center md:px-2 md:text-xs"><Fuel size={13} className="mt-0.5 shrink-0 md:mt-0" aria-hidden="true" /><span className="min-w-0">{title(car.fuelPolicy)}</span></span>
            {offer.freeCancellation && <span className="inline-flex min-h-6 max-w-full items-start gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold leading-4 text-emerald-700 md:items-center md:px-2 md:text-xs"><Check size={13} className="mt-0.5 shrink-0 md:mt-0" aria-hidden="true" /><span className="min-w-0">Free cancellation</span></span>}
            {offer.payAtPickup && <span className="inline-flex min-h-6 max-w-full items-start gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold leading-4 text-emerald-700 md:items-center md:px-2 md:text-xs"><Check size={13} className="mt-0.5 shrink-0 md:mt-0" aria-hidden="true" /><span className="min-w-0">Pay at pickup</span></span>}
          </div>
        </div>

        <div data-region="pricing" className="col-start-2 row-start-3 flex min-w-0 flex-col border-s border-t border-[#E2E8F0] bg-slate-50/45 px-3 py-3 text-end md:col-span-2 md:col-start-1 md:row-start-3 md:border-s-0 md:px-4 lg:col-span-1 lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:border-s lg:border-t-0 lg:bg-white lg:text-end">
          <div className="flex flex-col gap-2">
            <div className="order-1 md:order-2"><p className="break-words text-lg font-bold leading-7 tracking-[-0.01em] text-[#102A43] tabular-nums min-[380px]:whitespace-nowrap lg:text-xl" dir="ltr" title={totalDisplayPrice.title} aria-label={totalDisplayPrice.ariaLabel}>{totalDisplayPrice.formatted}</p><p className="text-xs font-medium text-slate-500">Total</p>{offer.taxesAndFeesIncluded && <p className="mt-1 text-xs leading-4 text-slate-500">Taxes and fees included</p>}</div>
            <div className="order-2 md:order-1"><p className="text-xs font-medium text-slate-500">Price per day</p><p className="mt-0.5 break-words text-sm font-semibold leading-5 text-slate-700 tabular-nums min-[380px]:whitespace-nowrap" dir="ltr" title={dailyDisplayPrice.title} aria-label={dailyDisplayPrice.ariaLabel}>{dailyDisplayPrice.formatted}</p></div>
          </div>
          <Link href={detailsHref} className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-[#004BB8] px-2 text-sm font-bold text-white transition hover:bg-[#021C2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/40 focus-visible:ring-offset-2 md:px-5 lg:mt-auto">View car</Link>
        </div>
      </div>
    </article>
  );
}
