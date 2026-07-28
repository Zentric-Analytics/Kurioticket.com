"use client";

import { useId } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  CarFront,
  Check,
  DoorOpen,
  Fuel,
  Gauge,
  MapPin,
  Snowflake,
  Users,
} from "lucide-react";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { CarResultImage } from "@/components/results/CarResultImage";
import { Button } from "@/components/ui/Button";
import { calculateRentalDays, getPrimaryCarOffer } from "@/lib/cars/carResults";
import type { CarSearchParams, NormalizedCarResult } from "@/lib/cars/types";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";

export type DealsCarPreviewCardProps = {
  car: NormalizedCarResult;
  badgeKey: string;
  locale: string;
  search: CarSearchParams;
  t: (key: string) => string;
};
const interpolate = (value: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce(
    (result, [key, replacement]) =>
      result.replaceAll(`{{${key}}}`, String(replacement)),
    value,
  );

export function DealsCarPreviewCard({
  car,
  badgeKey,
  search,
  t,
}: DealsCarPreviewCardProps) {
  const unavailableDescriptionId = useId();
  const { selectedOption } = useRegion();
  const rates = useCurrencyRates();
  const offer = getPrimaryCarOffer(car);
  if (!offer) return null;
  const display = (amount: number) =>
    formatDisplayPrice({
      amount,
      sourceCurrency: offer.currency,
      displayCurrency: selectedOption.currency,
      convertSourceEstimate: true,
      maximumFractionDigits: 0,
      rates: rates.rates,
      isFallbackRate: rates.isFallback,
    });
  const total = display(offer.totalPrice);
  const daily = display(offer.pricePerDay);
  const days = calculateRentalDays(search.pickupDate, search.dropoffDate);
  const specs = [
    [
      Users,
      interpolate(t("deals.results.car.passengers"), { count: car.passengers }),
    ],
    [
      BriefcaseBusiness,
      interpolate(t("deals.results.car.bags"), { count: car.bags }),
    ],
    [DoorOpen, interpolate(t("deals.results.car.doors"), { count: car.doors })],
    [CarFront, t(`deals.results.car.transmission.${car.transmission}`)],
  ] as const;
  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#D8E1EC] bg-white shadow-sm">
      <div className="p-5 pb-4">
        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-[#004BB8]">
          {t(badgeKey)}
        </span>
      </div>
      <div className="relative aspect-[16/9] bg-slate-100">
        <CarResultImage
          imageUrl={car.imageUrl}
          imageAlt={car.imageAlt}
          modelName={car.modelName}
          category={car.category}
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#004BB8]">
            {car.categoryLabel}
          </p>
          <h3 className="break-words text-lg font-extrabold text-slate-950">
            {car.modelName}
            {car.orSimilar ? ` ${t("deals.results.car.orSimilar")}` : ""}
          </h3>
        </div>
        <p className="mt-2 flex items-start gap-2 text-sm text-slate-700">
          <MapPin aria-hidden size={17} className="shrink-0 text-[#004BB8]" />
          <span className="min-w-0 break-words">
            {car.pickupLocation} ·{" "}
            {t(`deals.results.car.pickup.${car.pickupType}`)}
            {car.shuttleRequired ? ` · ${t("deals.results.car.shuttle")}` : ""}
          </span>
        </p>
        <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
          <div className="py-4">
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600">
              {specs.map(([Icon, label]) => (
                <li key={label} className="flex min-w-0 items-center gap-1.5">
                  <Icon aria-hidden size={15} className="shrink-0" />
                  <span className="min-w-0 break-words">{label}</span>
                </li>
              ))}
              {car.airConditioning && (
                <li className="flex min-w-0 items-center gap-1.5">
                  <Snowflake aria-hidden size={15} className="shrink-0" />
                  <span className="min-w-0 break-words">
                    {t("deals.results.car.airConditioning")}
                  </span>
                </li>
              )}
            </ul>
          </div>
          <div className="py-4">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1">
                <Gauge aria-hidden className="shrink-0" size={14} />
                {t(
                  car.mileagePolicy === "unlimited"
                    ? "deals.results.car.unlimitedMileage"
                    : "deals.results.car.limitedMileage",
                )}
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1">
                <Fuel aria-hidden className="shrink-0" size={14} />
                {t(`deals.results.car.fuel.${car.fuelPolicy}`)}
              </span>
              {offer.freeCancellation && (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-emerald-800">
                  <Check aria-hidden className="shrink-0" size={14} />
                  {t("deals.results.car.freeCancellation")}
                </span>
              )}
              {offer.payAtPickup && (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-emerald-800">
                  <Check aria-hidden className="shrink-0" size={14} />
                  {t("deals.results.car.payAtPickup")}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-auto pt-5">
          <p
            className="text-2xl font-extrabold text-[#004BB8]"
            dir="ltr"
            aria-label={total.ariaLabel}
          >
            {total.formatted}
          </p>
          <p className="break-words text-xs text-slate-600">
            {interpolate(t("deals.results.car.perDayAndDays"), {
              price: daily.formatted,
              count: days,
            })}{" "}
            ·{" "}
            {t(
              offer.taxesAndFeesIncluded
                ? "deals.results.car.taxesIncluded"
                : "deals.results.car.taxesUnknown",
            )}
          </p>
        </div>
        <div className="mt-5 border-t border-slate-200 pt-4">
          <span id={unavailableDescriptionId} className="sr-only">
            {t("deals.results.providerHandoff.unavailable")}
          </span>
          <Button
            type="button"
            variant="accent"
            size="lg"
            className="w-full"
            disabled
            aria-describedby={unavailableDescriptionId}
          >
            {t("continueToProvider")}
            <ArrowRight size={16} aria-hidden />
          </Button>
        </div>
      </div>
    </article>
  );
}
