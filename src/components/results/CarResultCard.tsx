"use client";

import Link from "next/link";
import {
  Award,
  BriefcaseBusiness,
  CarFront,
  ChevronRight,
  DoorOpen,
  Heart,
  MapPin,
  ShieldCheck,
  Snowflake,
  Share2,
  Star,
  Tag,
  Users,
} from "lucide-react";
import { useState, type MouseEvent as ReactMouseEvent } from "react";
import type { LucideIcon } from "lucide-react";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { CarResultImage } from "@/components/results/CarResultImage";
import {
  CarPriceComparison,
  type CarComparisonSource,
} from "@/components/results/CarPriceComparison";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRouteProgress } from "@/components/layout/RouteProgress";
import { CarsRouteLoadingOverlay } from "@/components/results/CarsRouteLoadingOverlay";
import { translations as enTranslations } from "@/lib/i18n/en";
import { useSavedCar } from "@/components/results/useSavedCar";
import {
  getCarSpecificationIcon,
  getMobileCarPrimarySpecs,
  getMobileCarResultIdentity,
  getMobileCarSpecColumns,
  getMobileProviderCarSpecSlots,
} from "@/components/results/carResultCardSpecs";
import type { CarResultBadge } from "@/lib/cars/carResults";
import { getPrimaryCarOffer } from "@/lib/cars/carResults";
import type { NormalizedCarResult } from "@/lib/cars/types";
import type { CarSearchParams } from "@/lib/cars/types";
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
  search,
  onSelect,
  actionLabel = "View car",
  providerLabel,
  actionAriaLabel,
  headingLevel = "h2",
  presentation = "standalone",
  planningLabels,
  desktopSurfaceParity = false,
}: {
  car: NormalizedCarResult;
  badge?: CarResultBadge;
  detailsHref: string | null;
  search: CarSearchParams;
  onSelect?: (car: NormalizedCarResult) => void;
  actionLabel?: string;
  providerLabel?: string;
  actionAriaLabel?: string;
  headingLevel?: "h2" | "h3";
  presentation?: "standalone" | "guided-planning";
  desktopSurfaceParity?: boolean;
  planningLabels?: {
    estimatedTotal: string;
    estimatedPerDay: string;
    disclosure: string;
    orSimilar: string;
  };
}) {
  const { isSaved, toggleSavedCar } = useSavedCar(car, search);
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? key;
  const { start: startRouteProgress } = useRouteProgress();
  const [shareConfirmation, setShareConfirmation] = useState("");
  const [mobileDetailsPending, setMobileDetailsPending] = useState(false);
  const { selectedOption } = useRegion();
  const currencyRates = useCurrencyRates();
  const offer = getPrimaryCarOffer(car);
  if (!offer) return null;
  const guidedPlanning = presentation === "guided-planning";
  const orSimilarLabel = planningLabels?.orSimilar ?? t("deals.results.car.orSimilar");
  const vehicleName = car.orSimilar
    ? `${car.modelName} ${orSimilarLabel}`
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
  const primarySpecifications: Array<[LucideIcon, string]> = [
    [Users, `${car.passengers} passengers`],
    [BriefcaseBusiness, `${car.bags} bags`],
    [DoorOpen, `${car.doors} doors`],
    [CarFront, title(car.transmission)],
  ];
  const specifications: Array<[LucideIcon, string]> = car.sandboxPresentation
    ? car.sandboxPresentation.specs.map((label) => [
        getCarSpecificationIcon(label),
        label,
      ])
    : guidedPlanning && car.airConditioning
      ? [...primarySpecifications, [Snowflake, "Air conditioning"]]
      : primarySpecifications;
  const desktopStandaloneSpecifications: Array<[LucideIcon, string]> =
    car.sandboxPresentation
      ? car.sandboxPresentation.specs.map((label) => [
          getCarSpecificationIcon(label),
          label,
        ])
      : [
          [Users, `${car.passengers} passengers`],
          [BriefcaseBusiness, `${car.bags} bags`],
          [DoorOpen, `${car.doors} doors`],
          [
            getCarSpecificationIcon(title(car.transmission)),
            title(car.transmission),
          ],
        ];
  const mobileIdentity = getMobileCarResultIdentity(car.modelName);
  const mobilePrimarySpecs = car.sandboxPresentation
    ? getMobileProviderCarSpecSlots(car.sandboxPresentation.specs)
    : getMobileCarPrimarySpecs(car);
  const mobileSpecColumns = getMobileCarSpecColumns(mobilePrimarySpecs);
  const comparisonSources: CarComparisonSource[] = [
    {
      id: `${car.id}-kurioticket-estimate`,
      displayName: car.sandboxPresentation ? `${offer.bookingProviderName} · KAYAK sandbox` : t("carsResults.comparison.estimateName"),
      currency: offer.currency,
      totalPrice: offer.totalPrice,
      perDayPrice: offer.pricePerDay,
      totalDisplay: totalDisplayPrice.formatted,
      perDayDisplay: dailyDisplayPrice.formatted,
      priceStatus: "estimate",
      bookable: false,
      handoffAvailable: false,
      disclosure: car.sandboxPresentation ? "Simulated KAYAK price. No real booking." : t("carsResults.comparison.planningPriceNotLive"),
    },
  ];

  const handleMobileDetailsNavigation = (
    event: ReactMouseEvent<HTMLAnchorElement>,
  ) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      window.matchMedia("(min-width: 1024px)").matches
    ) {
      return;
    }

    if (mobileDetailsPending) {
      event.preventDefault();
      return;
    }

    setMobileDetailsPending(true);
    startRouteProgress();
  };

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

  const cardActions = car.sandboxPresentation && guidedPlanning ? null : (
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
          className="translate-x-1.5"
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
        <Share2 size={18} className="-translate-x-1.5" aria-hidden="true" />
      </button>
    </div>
  );

  const mobileCardActions = car.sandboxPresentation ? null : (
    <div
      data-car-card-mobile-actions
      className="ms-auto flex shrink-0 items-center gap-0"
    >
      <button
        type="button"
        aria-label={`${isSaved ? "Unsave" : "Save"} ${car.modelName}`}
        aria-pressed={isSaved}
        onClick={toggleSavedCar}
        className={`relative flex h-11 w-7 shrink-0 items-start justify-end rounded-full border border-transparent bg-transparent pe-0.5 pt-0.5 transition before:absolute before:inset-y-0 before:-start-2 before:end-0 before:content-[''] hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/40 ${isSaved ? "text-rose-600" : "text-slate-700"}`}
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
        className="relative flex h-11 w-7 shrink-0 items-start justify-start rounded-full border border-transparent bg-transparent ps-0.5 pt-0.5 text-slate-700 transition before:absolute before:inset-y-0 before:start-0 before:-end-2 before:content-[''] hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/40"
      >
        <Share2 size={18} aria-hidden="true" />
      </button>
    </div>
  );

  return (
    <article
      className={`relative w-full overflow-hidden rounded-[13px] border border-[#D8E1EC] bg-[#E7EBF1] shadow-[0_2px_10px_rgba(24,48,91,0.08)] md:rounded-2xl ${desktopSurfaceParity ? "md:bg-[#E7EBF1]" : "md:bg-white"} md:shadow-[0_12px_30px_-24px_rgba(15,23,42,0.55)] md:transition md:duration-200 md:hover:-translate-y-0.5 md:hover:border-[#CBD6E2] md:hover:shadow-[0_18px_38px_-26px_rgba(15,23,42,0.42)]`}
    >
      <CarsRouteLoadingOverlay active={mobileDetailsPending} />
      {providerLabel && <p className={`px-4 pt-3 text-xs font-semibold text-amber-800 ${desktopSurfaceParity ? "lg:text-[13px] lg:leading-5" : ""}`}>{providerLabel}</p>}
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
            className="grid min-h-[156px] grid-cols-[40%_minmax(0,1fr)]"
          >
            <div
              data-car-card-mobile-image
              className="relative min-h-full overflow-hidden bg-white p-1.5"
            >
              <div className="relative h-full min-h-[144px] w-full overflow-hidden rounded-[10px]">
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
            </div>

            <div
              data-car-card-mobile-information
              className="min-w-0 bg-[#E7EBF1] px-2.5 pb-2 pt-[7px]"
            >
              {badge && BadgeIcon ? (
                <div className="mb-1 flex min-w-0 justify-end">
                  <span className="inline-flex min-h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[5px] bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold leading-4 text-emerald-700">
                    <BadgeIcon size={11} aria-hidden="true" />
                    {badge}
                  </span>
                </div>
              ) : null}
              <header
                data-car-card-mobile-utility-row
                className="flex min-w-0 items-start gap-1.5"
              >
                <div
                  data-car-card-mobile-utility-copy
                  className="min-w-0 flex-1 overflow-hidden"
                >
                  <div data-car-card-mobile-identity className="min-w-0">
                    {headingLevel === "h3" ? (
                      <h3 className="min-w-0 text-[#07133B]">
                        <span className="block min-w-0 truncate text-[15px] font-bold leading-[18px] tracking-[-0.01em]">
                          {mobileIdentity.primaryName}
                        </span>
                        {mobileIdentity.secondaryModel || car.orSimilar ? (
                          <span className="block min-w-0 truncate leading-[18px]">
                            {mobileIdentity.secondaryModel ? (
                              <span className="text-[15px] font-bold tracking-[-0.01em] text-[#07133B]">
                                {mobileIdentity.secondaryModel}
                              </span>
                            ) : null}
                            {mobileIdentity.secondaryModel && car.orSimilar ? " " : null}
                            {car.orSimilar ? (
                              <span className="whitespace-nowrap text-[11px] font-medium text-[#536B92]">
                                {orSimilarLabel}
                              </span>
                            ) : null}
                          </span>
                        ) : null}
                      </h3>
                    ) : (
                      <h2 className="min-w-0 text-[#07133B]">
                        <span className="block min-w-0 truncate text-[15px] font-bold leading-[18px] tracking-[-0.01em]">
                          {mobileIdentity.primaryName}
                        </span>
                        {mobileIdentity.secondaryModel || car.orSimilar ? (
                          <span className="block min-w-0 truncate leading-[18px]">
                            {mobileIdentity.secondaryModel ? (
                              <span className="text-[15px] font-bold tracking-[-0.01em] text-[#07133B]">
                                {mobileIdentity.secondaryModel}
                              </span>
                            ) : null}
                            {mobileIdentity.secondaryModel && car.orSimilar ? " " : null}
                            {car.orSimilar ? (
                              <span className="whitespace-nowrap text-[11px] font-medium text-[#536B92]">
                                {orSimilarLabel}
                              </span>
                            ) : null}
                          </span>
                        ) : null}
                      </h2>
                    )}
                    {car.categoryLabel ? <p className="mt-0.5 truncate text-[10px] font-bold uppercase leading-[15px] tracking-[0.09em] text-[#004BB8]">{car.categoryLabel}</p> : null}
                  </div>
                </div>
                {mobileCardActions}
              </header>
              <p className="mt-1.5 flex min-w-0 items-start gap-1 text-[11px] font-medium leading-[15px] text-[#536B92]">
                <MapPin
                  size={13}
                  className="mt-px shrink-0 text-[#07133B]"
                  aria-hidden="true"
                />
                <span className="min-w-0">{car.pickupLocation}</span>
              </p>
              {offer.freeCancellation && (
                <span className="mt-1.5 inline-flex max-w-full items-center gap-1 text-[11px] font-semibold leading-[15px] text-black">
                  <ShieldCheck size={13} className="shrink-0" aria-hidden="true" />
                  <span className="min-w-0">Free cancellation</span>
                </span>
              )}
            </div>
          </div>

          <div
            data-car-card-mobile-lower-band
            className="flex min-w-0 items-stretch border-t border-[#CBD5E1] bg-[#E7EBF1]"
          >
            <div
              data-car-card-mobile-specs
              className="grid min-w-0 flex-[2] grid-cols-2 gap-x-1 px-2 py-2.5 text-[11px] font-medium leading-[14px] text-[#536B92]"
            >
              {mobileSpecColumns.map((column, columnIndex) => (
                <ul key={columnIndex} className="min-w-0 space-y-2">
                  {column.map(([Icon, label]) => (
                    <li key={label} className="flex min-w-0 items-start gap-1">
                      <Icon size={14} className="mt-px shrink-0 text-slate-500" aria-hidden="true" />
                      <span className="min-w-0 break-words">{label}</span>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
            <div className="flex min-w-0 flex-[1.35] flex-col items-end px-2.5 pb-1 pt-2">
              <p
                className="max-w-full whitespace-nowrap text-[19px] font-semibold leading-[22px] tracking-[-0.02em] text-[#07133B] tabular-nums"
                dir="ltr"
                title={dailyDisplayPrice.title}
                aria-label={dailyDisplayPrice.ariaLabel}
              >
                {dailyDisplayPrice.formatted}
              </p>
              <p className="mt-px text-[10px] font-medium leading-[13px] text-[#536B92]">per day</p>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(car)}
                aria-label={actionAriaLabel}
                className="inline-flex min-h-9 shrink-0 items-center justify-end gap-1 text-[13px] font-semibold text-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/40"
              >
                View deal <ChevronRight size={16} aria-hidden="true" />
              </button>
            ) : detailsHref ? (
              <Link
                href={detailsHref}
                prefetch={car.inventorySource === "kayak-sandbox" ? false : undefined}
                aria-label={actionAriaLabel}
                aria-disabled={mobileDetailsPending}
                onClick={handleMobileDetailsNavigation}
                className="inline-flex min-h-9 shrink-0 items-center justify-end gap-1 text-[13px] font-semibold text-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/40"
              >
                View deal <ChevronRight size={16} aria-hidden="true" />
              </Link>
            ) : (
              <button
                type="button"
                disabled
                aria-label={actionAriaLabel}
                className="inline-flex min-h-9 shrink-0 cursor-not-allowed items-center justify-end gap-1 text-[13px] font-semibold text-slate-400"
              >
                View deal <ChevronRight size={16} aria-hidden="true" />
              </button>
            )}
            </div>
          </div>
        </div>
      )}

      <div
        className={`${guidedPlanning ? "grid lg:grid-cols-[250px_minmax(0,1fr)_205px] xl:grid-cols-[270px_minmax(0,1fr)_205px]" : "hidden md:grid lg:grid-cols-[220px_minmax(0,1fr)_152px] xl:grid-cols-[228px_minmax(0,1fr)_152px]"} grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:grid-cols-[250px_minmax(0,1fr)]`}
      >
        <div
          data-region="image"
          className={`col-span-2 row-start-1 flex items-stretch border-b border-[#E2E8F0] bg-white md:col-span-1 md:col-start-1 md:row-span-2 md:row-start-1 md:border-b-0 md:border-e ${!guidedPlanning ? "lg:border-e-0" : ""}`}
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-white md:aspect-auto md:h-full md:min-h-[220px]">
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
          className={
            guidedPlanning
              ? "col-span-2 row-start-2 min-w-0 px-3.5 py-2.5 md:col-span-1 md:col-start-2 md:row-start-1 md:px-4 md:pb-1 md:pt-3"
              : "col-span-2 row-start-2 min-w-0 px-3.5 py-2.5 md:col-span-1 md:col-start-2 md:row-start-1 md:px-4 md:pb-1 md:pt-3 lg:col-span-2 lg:col-start-2 lg:px-0 lg:pb-1 lg:pt-0"
          }
        >
          {guidedPlanning ? (
            <>
              <header className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#004BB8]">
                    {car.categoryLabel}
                  </p>
                  {headingLevel === "h3" ? (
                    <h3 className="mt-0.5 break-words text-[22px] font-extrabold leading-tight text-[#102A43]">
                      {vehicleName}
                    </h3>
                  ) : (
                    <h2 className="mt-0.5 break-words text-[22px] font-extrabold leading-tight text-[#102A43]">
                      {vehicleName}
                    </h2>
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

              <p className="mt-2 flex min-w-0 items-center gap-1.5 text-[12px] font-medium text-[#536B92]">
                <MapPin
                  size={16}
                  className="shrink-0 text-[#07133B]"
                  aria-hidden="true"
                />
                <span className="min-w-0 whitespace-normal md:whitespace-nowrap">
                  {car.sandboxPresentation?.pickupLabel ? (
                    <>
                      <strong className="font-semibold text-[#536B92]">
                        {car.sandboxPresentation.pickupLabel}
                      </strong>
                      {" · "}
                    </>
                  ) : null}
                  {car.pickupLocation}
                  {car.shuttleRequired ? " · Shuttle required" : ""}
                </span>
              </p>
            </>
          ) : (
            <>
              <div className="lg:hidden">
                <header className="grid grid-cols-1 items-start gap-y-0">
                  <div
                    data-car-card-desktop-title-row
                    className="row-start-1 flex min-w-0 items-center self-center"
                  >
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0">
                      {headingLevel === "h3" ? (
                        <h3 className="min-w-0 break-words text-[18px] font-bold leading-tight text-[#07133B]">
                          {car.modelName}
                        </h3>
                      ) : (
                        <h2 className="min-w-0 break-words text-[18px] font-bold leading-tight text-[#07133B]">
                          {car.modelName}
                        </h2>
                      )}
                      {car.orSimilar ? (
                        <span className="text-[11px] font-medium leading-4 text-[#536B92]">
                          or similar
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {car.categoryLabel ? (
                    <p className="row-start-2 mt-2 text-[10px] font-bold uppercase leading-none tracking-[0.14em] text-[#004BB8]">
                      {car.categoryLabel}
                    </p>
                  ) : null}
                </header>

                <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[12px] font-medium text-[#536B92]">
                  <MapPin
                    size={16}
                    className="shrink-0 text-[#07133B]"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 whitespace-normal md:whitespace-nowrap">
                    {car.pickupLocation}
                    {car.shuttleRequired ? " · Shuttle required" : ""}
                  </span>
                </p>

                {offer.freeCancellation ? (
                  <div
                    data-car-card-desktop-free-cancellation
                    className="mt-2 flex min-w-0 items-center gap-1.5 text-[12px] font-semibold leading-4 text-black"
                  >
                    <ShieldCheck
                      size={14}
                      className="shrink-0 text-black"
                      aria-hidden="true"
                    />
                    <span>{t("carsResults.freeCancellation")}</span>
                  </div>
                ) : null}
              </div>

              <div
                data-car-card-desktop-shared-header
                className={`hidden lg:grid lg:grid-cols-[minmax(0,1fr)_152px] lg:gap-y-0 ${badge && BadgeIcon ? "lg:grid-rows-[24px_44px_auto_auto_auto]" : "lg:grid-rows-[44px_auto_auto_auto]"}`}
              >
                <div
                  data-car-card-desktop-header-rail
                  className={`pointer-events-none z-0 col-start-2 row-start-1 row-span-full ${desktopSurfaceParity ? "bg-[#E7EBF1]" : "bg-white"}`}
                  aria-hidden="true"
                />

                {badge && BadgeIcon ? (
                  <div className="z-10 col-start-2 row-start-1 flex h-6 items-start justify-end px-3">
                    <span
                      data-car-card-desktop-badge
                      className="inline-flex min-h-6 shrink-0 items-center gap-1 rounded-md bg-[#EAF2FB] px-2 py-0.5 text-xs font-semibold text-[#004BB8] lg:text-[13px] lg:leading-5"
                    >
                      <BadgeIcon size={13} aria-hidden="true" />
                      {badge}
                    </span>
                  </div>
                ) : null}

                <div
                  data-car-card-desktop-title-row
                  className={`col-start-1 ${badge && BadgeIcon ? "row-start-2" : "row-start-1"} flex h-11 min-w-0 items-center px-4`}
                >
                  <div className="flex min-w-0 flex-nowrap items-baseline gap-x-2 gap-y-0">
                    {headingLevel === "h3" ? (
                      <h3 className="min-w-0 whitespace-nowrap text-[19px] font-bold leading-[24px] tracking-[-0.012em] text-[#07133B]">
                        {car.modelName}
                      </h3>
                    ) : (
                      <h2 className="min-w-0 whitespace-nowrap text-[19px] font-bold leading-[24px] tracking-[-0.012em] text-[#07133B]">
                        {car.modelName}
                      </h2>
                    )}
                    {car.orSimilar ? (
                      <span className="shrink-0 whitespace-nowrap text-[12px] font-medium leading-4 tracking-[-0.001em] text-[#475569]">
                        or similar
                      </span>
                    ) : null}
                  </div>
                </div>

                {car.categoryLabel ? (
                  <p
                    className={`col-start-1 ${badge && BadgeIcon ? "row-start-3" : "row-start-2"} mt-1 whitespace-nowrap px-4 text-[10px] font-bold uppercase leading-[15px] tracking-[0.1em] text-[#004BB8]`}
                  >
                    {car.categoryLabel}
                  </p>
                ) : null}

                <div
                  data-car-card-desktop-actions
                  className={`z-10 col-start-2 ${badge && BadgeIcon ? "row-start-2" : "row-start-1"} flex h-11 items-center justify-end px-3`}
                >
                  {cardActions}
                </div>

                <p
                  className={`z-10 col-start-1 col-span-2 ${badge && BadgeIcon ? "row-start-4" : "row-start-3"} mt-2 flex min-w-0 items-center gap-1.5 px-4 text-[13px] font-medium leading-[18px] tracking-[-0.001em] text-[#334155]`}
                >
                  <MapPin
                    size={15}
                    className="shrink-0 text-[#07133B]"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 whitespace-nowrap">
                    {car.pickupLocation}
                    {car.shuttleRequired ? " · Shuttle required" : ""}
                  </span>
                </p>

                {offer.freeCancellation ? (
                  <div
                    data-car-card-desktop-free-cancellation
                    className={`z-10 col-start-1 col-span-2 ${badge && BadgeIcon ? "row-start-5" : "row-start-4"} mt-2 flex min-w-0 items-center gap-1.5 px-4 text-[13px] font-semibold leading-[18px] tracking-[-0.001em] text-slate-950`}
                  >
                    <ShieldCheck
                      size={13}
                      className="shrink-0 text-black"
                      aria-hidden="true"
                    />
                    <span className="whitespace-nowrap">{t("carsResults.freeCancellation")}</span>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>

        <div
          data-region="details"
          className={`col-start-1 row-start-3 min-w-0 border-t border-[#E2E8F0] px-3 py-3 md:col-start-2 md:row-start-2 md:border-t-0 md:px-4 md:pb-3 md:pt-1 ${!guidedPlanning ? "lg:border-t lg:border-[#CBD5E1]" : ""}`}
        >
          <ul
            data-car-card-desktop-primary-specs
            className={`grid gap-x-5 gap-y-2 text-[12px] font-medium leading-4 text-[#536B92] ${guidedPlanning ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2 lg:text-[13px] lg:font-medium lg:leading-[18px] lg:tracking-[-0.001em] lg:text-[#334155]"}`}
          >
            {(guidedPlanning ? specifications : desktopStandaloneSpecifications).map(([Icon, label]) => (
              <li key={label} className="flex min-w-0 items-center gap-1.5">
                <Icon
                  size={guidedPlanning ? 16 : 15}
                  className="shrink-0 text-slate-500"
                  aria-hidden="true"
                />
                <span className="min-w-0 whitespace-nowrap">{label}</span>
              </li>
            ))}
          </ul>

        </div>

        <div
          data-region="pricing"
          className={`col-start-2 row-start-3 flex min-w-0 flex-col items-center border-s border-t border-[#E2E8F0] px-3 py-3 text-center md:col-span-2 md:col-start-1 md:row-start-3 md:border-s-0 md:px-4 lg:col-span-1 lg:col-start-3 ${!guidedPlanning ? "lg:row-start-2 lg:row-span-1 lg:items-stretch lg:border-s lg:border-t lg:border-[#CBD5E1] lg:pb-3 lg:text-right" : "lg:row-span-2 lg:row-start-1 lg:items-center lg:justify-center lg:border-s lg:border-t-0 lg:text-center"} ${desktopSurfaceParity ? "bg-[#E7EBF1]" : "bg-slate-50/45 lg:bg-white"}`}
        >
          {!guidedPlanning ? (
            <div
              data-car-card-desktop-right-rail
              className="flex h-full w-full flex-col items-end"
            >
              <div
                data-car-card-desktop-actions
                className="flex w-full shrink-0 flex-col items-end lg:hidden"
              >
                {badge && BadgeIcon ? (
                  <span
                    data-car-card-desktop-badge
                    className="inline-flex min-h-6 shrink-0 items-center gap-1 rounded-md bg-[#EAF2FB] px-2 py-0.5 text-xs font-semibold text-[#004BB8] lg:text-[13px] lg:leading-5"
                  >
                    <BadgeIcon size={13} aria-hidden="true" />
                    {badge}
                  </span>
                ) : null}
                {cardActions}
              </div>

              <div className="mt-auto w-full">
                <CarPriceComparison
                  resultId={car.id}
                  sources={comparisonSources}
                  cleanStaticSummary
                  labels={{
                    source: t("carsResults.comparison.source"),
                    estimate: t("carsResults.comparison.estimate"),
                    comparePrices: "View deal",
                    hidePrices: t("carsResults.comparison.hidePrices"),
                    liveDealsComingSoon: t("carsResults.comparison.liveDealsComingSoon"),
                    notBookable: t("carsResults.comparison.notBookable"),
                    total: t("carsResults.comparison.total"),
                    perDay: t("carsResults.comparison.perDay"),
                  }}
                />
              </div>
            </div>
          ) : (
            <>
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
              prefetch={car.inventorySource === "kayak-sandbox" ? false : undefined}
              aria-label={actionAriaLabel}
              aria-disabled={mobileDetailsPending}
              onClick={handleMobileDetailsNavigation}
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
            </>
          )}
        </div>
      </div>
    </article>
  );
}
