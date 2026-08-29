"use client";

import Link from "next/link";
import {
  Award,
  BriefcaseBusiness,
  CarFront,
  Check,
  DoorOpen,
  Fuel,
  Gauge,
  Heart,
  MapPin,
  Snowflake,
  Share2,
  Star,
  Tag,
  Users,
} from "lucide-react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { CarResultImage } from "@/components/results/CarResultImage";
import { useSavedCar } from "@/components/results/useSavedCar";
import {
  formatCarPickupType,
  getMobileCarPrimarySpecs,
} from "@/components/results/carResultCardSpecs";
import type { CarResultBadge } from "@/lib/cars/carResults";
import { getPrimaryCarOffer } from "@/lib/cars/carResults";
import type { NormalizedCarResult } from "@/lib/cars/types";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";

const title = (value: string) =>
  value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const carResultBadgeIcons: Record<CarResultBadge, LucideIcon> = {
  "Best value": Award,
  Cheapest: Tag,
  "Top rated": Star,
};

export function CarResultCard({
  car,
  badge,
  detailsHref,
  onSelect,
  actionLabel = "View car",
  actionAriaLabel,
  headingLevel = "h2",
  presentation = "standalone",
  planningLabels,
}: {
  car: NormalizedCarResult;
  badge?: CarResultBadge;
  detailsHref: string | null;
  onSelect?: (car: NormalizedCarResult) => void;
  actionLabel?: string;
  actionAriaLabel?: string;
  headingLevel?: "h2" | "h3";
  presentation?: "standalone" | "guided-planning";
  planningLabels?: {
    estimatedTotal: string;
    estimatedPerDay: string;
    disclosure: string;
    orSimilar: string;
  };
}) {
  const { isSaved, toggleSavedCar } = useSavedCar(car.id);
  const [shareConfirmation, setShareConfirmation] = useState("");
  const { selectedOption } = useRegion();
  const currencyRates = useCurrencyRates();
  const offer = getPrimaryCarOffer(car);
  if (!offer) return null;
  const guidedPlanning = presentation === "guided-planning";
  const vehicleName = car.orSimilar
    ? `${car.modelName} ${planningLabels?.orSimilar ?? "or similar"}`
    : car.modelName;
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
  const mobilePrimarySpecs = getMobileCarPrimarySpecs(car);

  async function shareCar() {
    const relativeUrl = detailsHref ?? window.location.href;
    const url = new URL(relativeUrl, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title: car.modelName, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareConfirmation(`${car.modelName} link copied`);
      window.setTimeout(() => setShareConfirmation(""), 2200);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      // Share and clipboard permissions are browser-controlled enhancements.
    }
  }

  const cardActions = (
    <div data-car-card-actions className="flex shrink-0 items-center">
      <button
        type="button"
        aria-label={`${isSaved ? "Unsave" : "Save"} ${car.modelName}`}
        aria-pressed={isSaved}
        onClick={toggleSavedCar}
        className={`inline-flex h-11 w-11 items-center justify-center rounded-full bg-transparent transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/40 ${isSaved ? "text-rose-600" : "text-slate-600"}`}
      >
        <Heart
          size={18}
          fill={isSaved ? "currentColor" : "none"}
          aria-hidden="true"
        />
      </button>
      <button
        type="button"
        aria-label={`Share ${car.modelName}`}
        onClick={() => void shareCar()}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-transparent text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/40"
      >
        <Share2 size={18} aria-hidden="true" />
      </button>
    </div>
  );

  const mobileCardActions = (
    <div
      data-car-card-mobile-actions
      className="flex h-8 shrink-0 items-center gap-2"
    >
      <button
        type="button"
        aria-label={`${isSaved ? "Unsave" : "Save"} ${car.modelName}`}
        aria-pressed={isSaved}
        onClick={toggleSavedCar}
        className={`relative inline-flex h-8 w-8 items-center justify-center rounded-md bg-transparent transition before:absolute before:-inset-1 before:content-[''] hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/40 ${isSaved ? "text-rose-600" : "text-slate-600"}`}
      >
        <Heart
          size={17}
          fill={isSaved ? "currentColor" : "none"}
          aria-hidden="true"
        />
      </button>
      <button
        type="button"
        aria-label={`Share ${car.modelName}`}
        onClick={() => void shareCar()}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-md bg-transparent text-slate-600 transition before:absolute before:-inset-1 before:content-[''] hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/40"
      >
        <Share2 size={17} aria-hidden="true" />
      </button>
    </div>
  );

  return (
    <article className="relative w-full overflow-hidden rounded-[13px] border md:rounded-2xl border-[#D8E1EC] bg-white shadow-[0_12px_30px_-24px_rgba(15,23,42,0.55)] transition duration-200 hover:-translate-y-0.5 hover:border-[#CBD6E2] hover:shadow-[0_18px_38px_-26px_rgba(15,23,42,0.42)]">
      {shareConfirmation ? (
        <span
          role="status"
          aria-live="polite"
          className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[100] mx-auto w-fit max-w-[calc(100%-2rem)] rounded-full bg-[#07133B] px-4 py-2 text-center text-sm font-semibold text-white shadow-lg"
        >
          {shareConfirmation}
        </span>
      ) : null}
      {!guidedPlanning && (
        <div className="md:hidden">
          <div
            data-car-card-mobile-main
            className="grid min-h-[168px] grid-cols-[40%_minmax(0,1fr)]"
          >
            <div
              data-car-card-mobile-image
              className="relative min-h-full overflow-hidden bg-slate-50"
            >
              <CarResultImage
                imageUrl={car.imageUrl}
                imageAlt={car.imageAlt}
                modelName={car.modelName}
                category={car.category}
                sizes="(max-width: 767px) 40vw, 250px"
                fit="cover"
                position={car.imagePosition}
              />
            </div>

            <div
              data-car-card-mobile-information
              className="min-w-0 px-2.5 py-2.5"
            >
              <header
                data-car-card-mobile-utility-row
                className="flex min-h-8 min-w-0 items-center justify-between gap-1"
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <p className="min-w-0 text-[10px] font-bold uppercase tracking-[0.14em] text-[#004BB8]">
                    {car.categoryLabel}
                  </p>
                  {badge && BadgeIcon && (
                    <span className="inline-flex min-h-5 max-w-full items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold leading-4 text-emerald-700">
                      <BadgeIcon size={11} aria-hidden="true" />
                      {badge}
                    </span>
                  )}
                </div>
                {mobileCardActions}
              </header>
              <div
                data-car-card-mobile-identity
                className="mt-0.5 flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0"
              >
                {headingLevel === "h3" ? (
                  <h3 className="min-w-0 break-words text-[18px] font-bold leading-[1.18] text-[#07133B]">
                    {car.modelName}
                  </h3>
                ) : (
                  <h2 className="min-w-0 break-words text-[18px] font-bold leading-[1.18] text-[#07133B]">
                    {car.modelName}
                  </h2>
                )}
                {car.orSimilar ? (
                  <span className="text-[11px] font-medium leading-4 text-[#536B92]">
                    or similar
                  </span>
                ) : null}
              </div>
              <p className="mt-1 flex min-w-0 items-start gap-1 text-[12px] font-medium leading-4 text-[#536B92]">
                <MapPin
                  size={13}
                  className="mt-0.5 shrink-0 text-[#004BB8]"
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <strong className="font-semibold text-[#536B92]">
                    {formatCarPickupType(car.pickupType)}
                  </strong>
                  {" · "}
                  {car.pickupLocation}
                </span>
              </p>
              <ul
                data-car-card-mobile-specs
                className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1.5 text-[12px] font-medium leading-4 text-[#536B92]"
              >
                {mobilePrimarySpecs.map(([Icon, label]) => (
                  <li key={label} className="flex min-w-0 items-start gap-1">
                    <Icon
                      size={14}
                      className="mt-px shrink-0 text-slate-500"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 break-words">{label}</span>
                  </li>
                ))}
              </ul>
              {offer.freeCancellation && (
                <span className="mt-2 inline-flex min-h-5 max-w-full items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold leading-4 text-emerald-700">
                  <Check size={13} className="shrink-0" aria-hidden="true" />
                  <span className="min-w-0">Free cancellation</span>
                </span>
              )}
            </div>
          </div>

          <div
            data-car-card-mobile-conversion
            className="flex min-w-0 items-center justify-between gap-3 border-t border-[#E2E8F0] bg-slate-50/45 px-3 py-2.5"
          >
            <div className="min-w-0">
              <p
                className="max-w-full whitespace-nowrap text-[23px] font-semibold leading-none tracking-[-0.02em] text-[#07133B] tabular-nums"
                dir="ltr"
                title={totalDisplayPrice.title}
                aria-label={totalDisplayPrice.ariaLabel}
              >
                {totalDisplayPrice.formatted}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-1 text-[10px] font-medium uppercase leading-3 tracking-[0.06em] text-slate-500">
                <span>Total</span>
                <span aria-hidden="true">·</span>
                <span
                  className="whitespace-nowrap normal-case tracking-normal text-slate-600 tabular-nums"
                  dir="ltr"
                  title={dailyDisplayPrice.title}
                  aria-label={dailyDisplayPrice.ariaLabel}
                >
                  {dailyDisplayPrice.formatted}/day
                </span>
              </p>
            </div>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(car)}
                aria-label={actionAriaLabel}
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-[#004BB8] px-4 text-sm font-semibold text-white transition hover:bg-[#021C2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/40 focus-visible:ring-offset-2"
              >
                {actionLabel}
              </button>
            ) : detailsHref ? (
              <Link
                href={detailsHref}
                aria-label={actionAriaLabel}
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-[#004BB8] px-4 text-sm font-semibold text-white transition hover:bg-[#021C2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/40 focus-visible:ring-offset-2"
              >
                {actionLabel}
              </Link>
            ) : (
              <button
                type="button"
                disabled
                aria-label={actionAriaLabel}
                className="inline-flex min-h-11 shrink-0 cursor-not-allowed items-center justify-center rounded-md bg-slate-300 px-4 text-sm font-semibold text-white"
              >
                {actionLabel}
              </button>
            )}
          </div>
        </div>
      )}

      <div
        className={`${guidedPlanning ? "grid" : "hidden md:grid"} grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:grid-cols-[250px_minmax(0,1fr)] lg:grid-cols-[250px_minmax(0,1fr)_205px] xl:grid-cols-[270px_minmax(0,1fr)_205px]`}
      >
        <div
          data-region="image"
          className="col-span-2 row-start-1 flex items-center border-b border-[#E2E8F0] bg-slate-50 md:col-span-1 md:col-start-1 md:row-span-2 md:row-start-1 md:border-b-0 md:border-e md:p-2.5"
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 md:rounded-xl">
            <CarResultImage
              imageUrl={car.imageUrl}
              imageAlt={car.imageAlt}
              modelName={car.modelName}
              category={car.category}
            />
          </div>
        </div>

        <div
          data-region="heading"
          className="col-span-2 row-start-2 min-w-0 px-3.5 py-2.5 md:col-span-1 md:col-start-2 md:row-start-1 md:px-4 md:pb-1 md:pt-3"
        >
          <header className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#004BB8]">
                {car.categoryLabel}
              </p>
              {guidedPlanning ? (
                headingLevel === "h3" ? (
                  <h3 className="mt-0.5 break-words text-[22px] font-extrabold leading-tight text-[#102A43]">
                    {vehicleName}
                  </h3>
                ) : (
                  <h2 className="mt-0.5 break-words text-[22px] font-extrabold leading-tight text-[#102A43]">
                    {vehicleName}
                  </h2>
                )
              ) : (
                <div className="mt-0.5 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0">
                  {headingLevel === "h3" ? (
                    <h3 className="min-w-0 break-words text-[22px] font-bold leading-tight text-[#07133B]">
                      {car.modelName}
                    </h3>
                  ) : (
                    <h2 className="min-w-0 break-words text-[22px] font-bold leading-tight text-[#07133B]">
                      {car.modelName}
                    </h2>
                  )}
                  {car.orSimilar ? (
                    <span className="text-[12px] font-medium leading-4 text-[#536B92]">
                      or similar
                    </span>
                  ) : null}
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-start gap-1">
              {badge && BadgeIcon && (
                <span className="inline-flex min-h-6 shrink-0 items-center gap-1 rounded-md bg-[#EAF2FB] px-2 py-0.5 text-xs font-semibold text-[#004BB8]">
                  <BadgeIcon size={13} aria-hidden="true" />
                  {badge}
                </span>
              )}
              {cardActions}
            </div>
          </header>

          <p className="mt-1 flex min-w-0 items-center gap-2 text-sm font-medium text-[#536B92]">
            <MapPin
              size={16}
              className="shrink-0 text-[#004BB8]"
              aria-hidden="true"
            />
            <span className="min-w-0 whitespace-normal md:whitespace-nowrap">
              <strong className="font-semibold text-[#536B92]">
                {formatCarPickupType(car.pickupType)}
              </strong>
              {" · "}
              {car.pickupLocation}
              {car.shuttleRequired ? " · Shuttle required" : ""}
            </span>
          </p>
        </div>

        <div
          data-region="details"
          className="col-start-1 row-start-3 min-w-0 border-t border-[#E2E8F0] px-3 py-3 md:col-start-2 md:row-start-2 md:border-t-0 md:px-4 md:pb-3 md:pt-1"
        >
          <ul className="grid grid-cols-1 gap-y-1.5 text-[12px] font-medium leading-4 text-[#536B92] md:flex md:flex-wrap md:gap-x-3 md:gap-y-1.5 md:text-sm">
            {specifications.map(([Icon, label]) => (
              <li key={label} className="flex min-w-0 items-center gap-1.5">
                <Icon
                  size={16}
                  className="shrink-0 text-slate-500"
                  aria-hidden="true"
                />
                <span className="min-w-0">{label}</span>
              </li>
            ))}
          </ul>

          <div className="mt-2 flex min-w-0 flex-col items-start gap-1.5 md:flex-row md:flex-wrap">
            <span className="inline-flex min-h-6 max-w-full items-start gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold leading-4 text-slate-700 md:items-center md:px-2 md:text-xs">
              <Gauge
                size={13}
                className="mt-0.5 shrink-0 md:mt-0"
                aria-hidden="true"
              />
              <span className="min-w-0">
                {car.mileagePolicy === "unlimited"
                  ? "Unlimited mileage"
                  : `${car.limitedMileageKm} km included`}
              </span>
            </span>
            <span className="inline-flex min-h-6 max-w-full items-start gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold leading-4 text-slate-700 md:items-center md:px-2 md:text-xs">
              <Fuel
                size={13}
                className="mt-0.5 shrink-0 md:mt-0"
                aria-hidden="true"
              />
              <span className="min-w-0">{title(car.fuelPolicy)}</span>
            </span>
            {!guidedPlanning && offer.freeCancellation && (
              <span className="inline-flex min-h-6 max-w-full items-start gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold leading-4 text-emerald-700 md:items-center md:px-2 md:text-xs">
                <Check
                  size={13}
                  className="mt-0.5 shrink-0 md:mt-0"
                  aria-hidden="true"
                />
                <span className="min-w-0">Free cancellation</span>
              </span>
            )}
            {!guidedPlanning && offer.payAtPickup && (
              <span className="inline-flex min-h-6 max-w-full items-start gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold leading-4 text-emerald-700 md:items-center md:px-2 md:text-xs">
                <Check
                  size={13}
                  className="mt-0.5 shrink-0 md:mt-0"
                  aria-hidden="true"
                />
                <span className="min-w-0">Pay at pickup</span>
              </span>
            )}
          </div>
        </div>

        <div
          data-region="pricing"
          className="col-start-2 row-start-3 flex min-w-0 flex-col items-center border-s border-t border-[#E2E8F0] bg-slate-50/45 px-3 py-3 text-center md:col-span-2 md:col-start-1 md:row-start-3 md:border-s-0 md:px-4 lg:col-span-1 lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:justify-center lg:border-s lg:border-t-0 lg:bg-white"
        >
          <div className="flex min-w-0 w-full flex-col items-center text-center">
            <p
              className="max-w-full whitespace-nowrap text-[clamp(1rem,4.5vw,1.25rem)] font-extrabold leading-tight tracking-[-0.025em] text-slate-950 tabular-nums lg:text-xl"
              dir="ltr"
              title={totalDisplayPrice.title}
              aria-label={totalDisplayPrice.ariaLabel}
            >
              {totalDisplayPrice.formatted}
            </p>
            <p className="mt-0.5 text-[10px] font-medium uppercase leading-none tracking-[0.08em] text-slate-600 sm:text-[11px]">
              {guidedPlanning ? planningLabels?.estimatedTotal : "Total"}
            </p>
            <p className="mt-2 text-xs font-medium leading-4 text-slate-600">
              {guidedPlanning
                ? planningLabels?.estimatedPerDay
                : "Price per day"}
              {": "}
              <span
                className="whitespace-nowrap font-semibold tabular-nums"
                dir="ltr"
                title={dailyDisplayPrice.title}
                aria-label={dailyDisplayPrice.ariaLabel}
              >
                {dailyDisplayPrice.formatted}
              </span>
            </p>
            {!guidedPlanning && offer.taxesAndFeesIncluded && (
              <p className="mt-1.5 text-xs leading-4 text-slate-500">
                Taxes and fees included
              </p>
            )}
          </div>
          {guidedPlanning && (
            <p className="mt-2 text-xs leading-4 text-slate-600">
              {planningLabels?.disclosure}
            </p>
          )}
          {onSelect ? (
            <button
              type="button"
              onClick={() => onSelect(car)}
              aria-label={actionAriaLabel}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#004BB8] px-2 text-sm font-bold text-white transition hover:bg-[#021C2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/40 focus-visible:ring-offset-2 md:px-5"
            >
              {actionLabel}
            </button>
          ) : detailsHref ? (
            <Link
              href={detailsHref}
              aria-label={actionAriaLabel}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#004BB8] px-2 text-sm font-bold text-white transition hover:bg-[#021C2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/40 focus-visible:ring-offset-2 md:px-5"
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              type="button"
              disabled
              aria-label={actionAriaLabel}
              className="mt-3 inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-lg bg-slate-300 px-2 text-sm font-bold text-white md:px-5"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
