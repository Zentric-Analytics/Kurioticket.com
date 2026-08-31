"use client";

import type { ReactNode, Ref } from "react";
import Image from "next/image";
import {
  Clock3,
  ExternalLink,
  Fuel,
  Gauge,
  Heart,
  MapPin,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { DetailsBackLink } from "@/components/results/DetailsBackLink";
import { CarDetailsHero } from "@/components/results/carDetails/CarDetailsHero";
import {
  CarDetailsSectionNav,
  type CarDetailsTab,
} from "@/components/results/carDetails/CarDetailsSectionNav";
import {
  formatCarDate,
  pickupTypeLabels,
} from "@/components/results/carDetails/helpers";
import { useSavedCar } from "@/components/results/useSavedCar";
import {
  buildCarDirectionsUrl,
  buildGoogleCarMapEmbedUrl,
} from "@/lib/cars/carMap";
import { calculateRentalDays, getPrimaryCarOffer } from "@/lib/cars/carResults";
import type {
  CarOffer,
  CarSearchParams,
  NormalizedCarResult,
} from "@/lib/cars/types";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import { translations as enTranslations } from "@/lib/i18n/en";
import { getDealsGuidedConfirmationActionId } from "@/lib/deals/dealsConfirmationIds";

export type CarDetailsPrimaryAction =
  | { kind: "standalone-disabled-provider"; label: string }
  | {
      kind: "guided-car";
      enabled: boolean;
      pending: boolean;
      label: string;
      accessibleLabel: string;
      unavailableMessage: string;
      error: string;
      onActivate: () => void;
    };

type HeadingLevel = 1 | 2 | 3 | 4;
type PriceFn = (
  amount: number,
  currency: string,
) => ReturnType<typeof formatDisplayPrice>;

const Heading = ({
  level,
  className,
  children,
  headingRef,
}: {
  level: HeadingLevel;
  className: string;
  children: ReactNode;
  headingRef?: Ref<HTMLHeadingElement>;
}) => {
  const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4";
  return (
    <Tag
      ref={headingRef}
      tabIndex={headingRef ? -1 : undefined}
      className={className}
    >
      {children}
    </Tag>
  );
};

export function CarDetailsExperience({
  car,
  search,
  primaryAction,
  presentation,
  primaryOffer: suppliedPrimaryOffer,
  modelHeadingLevel = 1,
  sectionHeadingLevel = 2,
  itemHeadingLevel = 3,
  modelHeadingRef,
}: {
  car: NormalizedCarResult;
  search: CarSearchParams;
  primaryAction: CarDetailsPrimaryAction;
  presentation: "standalone-content" | "guided-content";
  primaryOffer?: CarOffer | null;
  modelHeadingLevel?: HeadingLevel;
  sectionHeadingLevel?: HeadingLevel;
  itemHeadingLevel?: HeadingLevel;
  modelHeadingRef?: Ref<HTMLHeadingElement>;
}) {
  const { locale, t } = useLocale();
  const { selectedOption } = useRegion();
  const rates = useCurrencyRates();
  const { isSaved, toggleSavedCar } = useSavedCar(car.id);
  const [activeTab, setActiveTab] = useState<CarDetailsTab>("compare");
  const [shareConfirmation, setShareConfirmation] = useState("");
  const copy = (key: string) => t[key] || enTranslations[key] || key;
  const text = {
    passengers: copy("carsResults.passengers").toLowerCase(),
    bags: copy("carDetails.bags"),
    doors: copy("carsResults.doors").toLowerCase(),
    airConditioning: copy("carsResults.airConditioning"),
    unlimitedMileage: copy("carDetails.unlimitedMileage"),
    included: copy("carDetails.includedShort"),
    cancellation: copy("carDetails.cancellation"),
    freeCancellation: copy("carDetails.freeCancellation"),
    nonRefundable: copy("carDetails.nonRefundable"),
    taxesFees: copy("carDetails.taxesFees"),
    includedShort: copy("carDetails.includedShort"),
    notIncluded: copy("carDetails.notIncluded"),
  };
  const primaryOffer = suppliedPrimaryOffer ?? getPrimaryCarOffer(car);
  const days = calculateRentalDays(search.pickupDate, search.dropoffDate);
  const price = (amount: number, currency: string) =>
    formatDisplayPrice({
      amount,
      sourceCurrency: currency,
      displayCurrency: selectedOption.currency,
      convertSourceEstimate: true,
      maximumFractionDigits: 0,
      rates: rates.rates,
      isFallbackRate: rates.isFallback,
    });
  async function shareCar() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: car.modelName, url });
      else {
        await navigator.clipboard.writeText(url);
        setShareConfirmation(
          `${car.modelName} ${copy("carDetails.linkCopied")}`,
        );
        window.setTimeout(() => setShareConfirmation(""), 2200);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }
  const pickupSection = (
    <PickupReturnSection
      car={car}
      search={search}
      locale={locale}
      copy={copy}
      sectionHeadingLevel={sectionHeadingLevel}
      itemHeadingLevel={itemHeadingLevel}
    />
  );
  return (
    <div
      className={presentation === "guided-content" ? "mt-6" : ""}
      data-car-details-experience
    >
      {shareConfirmation ? (
        <span
          role="status"
          aria-live="polite"
          className="fixed inset-x-4 bottom-[calc(7rem+env(safe-area-inset-bottom))] z-[100] mx-auto w-fit max-w-[calc(100%-2rem)] rounded-full bg-[#07133B] px-4 py-2 text-center text-sm font-semibold text-white shadow-lg"
        >
          {shareConfirmation}
        </span>
      ) : null}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4 sm:space-y-5">
          <CarDetailsHero
            car={car}
            offer={primaryOffer}
            text={text}
            overlay={
              <div className="flex min-w-0 items-start justify-between gap-3 text-slate-950 md:text-white">
                <div className="min-w-0 pt-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500 md:text-white/85">
                    {car.categoryLabel}
                  </p>
                  <Heading
                    level={modelHeadingLevel}
                    headingRef={modelHeadingRef}
                    className="mt-0.5 scroll-mt-24 text-xl font-extrabold leading-tight tracking-[-0.025em] text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-[#075EE8] sm:text-3xl md:text-white md:focus-visible:ring-white"
                  >
                    {car.modelName}
                  </Heading>
                </div>
                <div
                  className="flex shrink-0 items-center gap-1"
                  data-car-details-actions
                >
                  <button
                    type="button"
                    aria-label={`${isSaved ? copy("carDetails.unsave") : copy("carDetails.save")} ${car.modelName}`}
                    aria-pressed={isSaved}
                    onClick={toggleSavedCar}
                    className={`focus-ring flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 md:border-white/35 md:bg-slate-950/35 md:text-white md:backdrop-blur-sm md:hover:bg-slate-950/55 ${isSaved ? "text-rose-500 md:text-rose-300" : ""}`}
                  >
                    <Heart
                      size={20}
                      fill={isSaved ? "currentColor" : "none"}
                      aria-hidden="true"
                    />
                  </button>
                  <button
                    type="button"
                    aria-label={`${copy("carDetails.share")} ${car.modelName}`}
                    onClick={() => void shareCar()}
                    className="focus-ring flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 md:border-white/35 md:bg-slate-950/35 md:text-white md:backdrop-blur-sm md:hover:bg-slate-950/55"
                  >
                    <Share2 size={19} aria-hidden="true" />
                  </button>
                </div>
              </div>
            }
          />
          {presentation === "standalone-content" ? (
            <>
              <CarDetailsSectionNav
                activeTab={activeTab}
                onTabChange={setActiveTab}
                labels={{
                  navigation: copy("carDetails.title"),
                  compare: copy("carDetails.comparePrices"),
                  pickup: copy("carDetails.pickupReturn"),
                  location: copy("carDetails.location"),
                }}
              />
              <div className="min-h-[240px]">
                <section
                  id="car-compare-panel"
                  role="tabpanel"
                  aria-labelledby="car-compare-tab"
                  hidden={activeTab !== "compare"}
                  className=""
                >
                  {primaryOffer ? (
                    <CarPriceComparisonSection
                      car={car}
                      search={search}
                      offer={primaryOffer}
                      days={days}
                      price={price}
                      copy={copy}
                      locale={locale}
                      headingLevel={sectionHeadingLevel}
                    />
                  ) : null}
                </section>
                <div
                  id="car-pickup-panel"
                  role="tabpanel"
                  aria-labelledby="car-pickup-tab"
                  hidden={activeTab !== "pickup"}
                >
                  {pickupSection}
                </div>
                <section
                  id="car-location-panel"
                  role="tabpanel"
                  aria-labelledby="car-location-tab"
                  hidden={activeTab !== "location"}
                  className=""
                >
                  <CarLocationSection
                    car={car}
                    search={search}
                    locale={locale}
                    copy={copy}
                    headingLevel={sectionHeadingLevel}
                  />
                </section>
              </div>
            </>
          ) : (
            pickupSection
          )}
        </div>
        {primaryOffer && (
          <aside
            className={
              presentation === "standalone-content"
                ? "hidden self-start lg:sticky lg:top-24 lg:block"
                : "self-start lg:sticky lg:top-24"
            }
          >
            <BookingSummary
              offer={primaryOffer}
              days={days}
              price={price}
              copy={copy}
              action={primaryAction}
            />
          </aside>
        )}
      </div>
      {presentation === "standalone-content" && primaryOffer ? (
        <MobileBookingDock
          offer={primaryOffer}
          days={days}
          price={price}
          copy={copy}
          action={primaryAction}
        />
      ) : null}
    </div>
  );
}

export function CarDetailsClient({
  car,
  search,
  resultsHref,
}: {
  car: NormalizedCarResult;
  search: CarSearchParams;
  resultsHref: string;
}) {
  const { t } = useLocale();
  const copy = (key: string) => t[key] || enTranslations[key] || key;
  return (
    <main className="flex-1 bg-white pb-[calc(7.5rem+env(safe-area-inset-bottom))] sm:bg-surface-muted/40 lg:pb-0">
      <section className="bg-white lg:border-b lg:border-border lg:pb-14">
        <div className="page-shell py-2 sm:py-7">
          <DetailsBackLink
            href={resultsHref}
            className="text-[#075EE8] hover:text-[#004BB8]"
          >
            {copy("carDetails.backToResults")}
          </DetailsBackLink>
          <div className="mt-2 sm:mt-5">
            <CarDetailsExperience
              car={car}
              search={search}
              presentation="standalone-content"
              primaryAction={{
                kind: "standalone-disabled-provider",
                label: copy("continueToProvider"),
              }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function CarPriceComparisonSection({
  car,
  search,
  offer,
  days,
  price,
  copy,
  locale,
  headingLevel,
}: {
  car: NormalizedCarResult;
  search: CarSearchParams;
  offer: CarOffer;
  days: number;
  price: PriceFn;
  copy: (key: string) => string;
  locale: string;
  headingLevel: HeadingLevel;
}) {
  const daily = price(offer.pricePerDay, offer.currency);
  const facts = [
    {
      label: offer.freeCancellation
        ? copy("carDetails.freeCancellation")
        : copy("carDetails.nonRefundable"),
      Icon: ShieldCheck,
    },
    {
      label:
        car.fuelPolicy === "full-to-full"
          ? copy("carsResults.fullToFull")
          : car.fuelPolicy === "same-to-same"
            ? copy("carsResults.sameToSame")
            : copy("carsResults.fuelPolicy"),
      Icon: Fuel,
    },
    {
      label:
        car.mileagePolicy === "unlimited"
          ? copy("carDetails.unlimitedMileage")
          : `${car.limitedMileageKm ?? "—"} km ${copy("carDetails.includedShort")}`,
      Icon: Gauge,
    },
  ];
  return (
    <div
      className="border-b border-slate-200 pb-7 pt-3"
      data-car-price-comparison
    >
      <Heading
        level={headingLevel}
        className="text-xl font-extrabold tracking-tight text-slate-950"
      >
        {copy("carDetails.comparePrices")}
      </Heading>
      <p className="mt-1 text-sm font-medium text-slate-600">
        {formatCarDate(search.pickupDate, locale)} –{" "}
        {formatCarDate(search.dropoffDate, locale)} · {days}{" "}
        {days === 1 ? copy("carDetails.day") : copy("carDetails.days")}
      </p>
      <div className="-mx-3 mt-5 rounded-[14px] border border-[#075EE8] bg-white px-2 py-4 ring-1 ring-[#075EE8]/10 sm:mx-0 sm:px-4">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 sm:gap-x-6">
          <Image
            src="/brand/kurioticket-logo-primary-light-bg.svg"
            alt="Kurioticket"
            width={146}
            height={32}
            className="self-start object-contain object-left"
          />
          <span
            className="flex size-[22px] items-center justify-center justify-self-end rounded-full border-2 border-[#075EE8] bg-white"
            aria-hidden="true"
          >
            <span className="size-2.5 rounded-full bg-[#075EE8]" />
          </span>
          <div className="col-span-2 mt-5 flex min-w-0 flex-nowrap items-center gap-x-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-x-4">
            {facts.map(({ label, Icon }) => (
              <span
                key={label}
                className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[11px] font-semibold text-slate-700 sm:gap-1.5 sm:text-xs"
              >
                <Icon
                  size={14}
                  strokeWidth={2}
                  className="shrink-0 text-[#075EE8]"
                  aria-hidden="true"
                />
                {label}
              </span>
            ))}
            <span className="ms-auto inline-flex shrink-0 flex-col items-end whitespace-nowrap text-right leading-none">
              <strong
                className="text-xl font-extrabold tracking-tight text-slate-950 tabular-nums"
                dir="ltr"
                title={daily.title}
                aria-label={daily.ariaLabel}
              >
                {daily.formatted}
              </strong>
              <span className="mt-1 text-[11px] font-medium text-slate-600 sm:text-xs">
                {copy("carsResults.perDay")}
              </span>
            </span>
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        {copy("carDetails.estimatedCataloguePrice")}
      </p>
    </div>
  );
}

function CarLocationSection({
  car,
  search,
  locale,
  copy,
  headingLevel,
}: {
  car: NormalizedCarResult;
  search: CarSearchParams;
  locale: string;
  copy: (key: string) => string;
  headingLevel: HeadingLevel;
}) {
  const searchedPickupLocation = search.pickupLocation.trim();
  const searchedReturnLocation = search.dropoffLocation.trim();
  const pickupLocation =
    searchedPickupLocation ||
    car.pickupLocation ||
    copy("carDetails.locationUnavailable");
  const returnLocation =
    searchedReturnLocation ||
    car.returnLocation ||
    copy("carDetails.locationUnavailable");
  const mapUrl = buildGoogleCarMapEmbedUrl({
    pickupLocation: searchedPickupLocation || car.pickupLocation,
    googleMapsEmbedApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY,
  });
  const directionsUrl = buildCarDirectionsUrl(
    searchedPickupLocation || car.pickupLocation,
  );
  return (
    <div
      className="border-b border-slate-200 pb-7 pt-3"
      data-car-location-section
    >
      <Heading
        level={headingLevel}
        className="text-xl font-extrabold tracking-tight text-slate-950"
      >
        {copy("carDetails.location")}
      </Heading>
      <div className="mt-3 flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue">
          <MapPin size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="text-[13px] font-semibold leading-5 text-slate-800">
            {pickupLocation}
          </p>
          <p className="text-xs leading-5 text-slate-500">
            {pickupTypeLabels[car.pickupType]}
          </p>
        </div>
      </div>
      {mapUrl ? (
        <div className="mt-4 overflow-hidden rounded-[14px] border border-slate-200 bg-white">
          <iframe
            title={`${copy("carDetails.mapShowingPickup")} ${pickupLocation}`}
            src={mapUrl}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            className="h-[200px] w-full border-0 sm:h-[220px] lg:h-[240px]"
          />
          {directionsUrl ? (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring flex min-h-11 items-center justify-between border-t border-slate-200 px-4 text-sm font-bold text-blue hover:bg-slate-50"
            >
              {copy("carDetails.getDirections")}
              <ExternalLink size={16} aria-hidden="true" />
            </a>
          ) : null}
        </div>
      ) : null}
      <div className="mt-4 overflow-hidden rounded-[14px] border border-slate-200 bg-white">
        <div className="p-4">
          {[
            [
              copy("carDetails.pickup"),
              pickupLocation,
              search.pickupDate,
              search.pickupTime,
            ],
            [
              copy("carDetails.return"),
              returnLocation,
              search.dropoffDate,
              search.dropoffTime,
            ],
          ].map(([label, location, date, time], index) => (
            <div
              key={label}
              className={`relative flex gap-3 ${index === 0 ? "pb-6" : ""}`}
            >
              <div className="relative flex w-9 shrink-0 justify-center">
                <span className="mt-1.5 size-3 rounded-full bg-[#075EE8]" />
                {index === 0 ? (
                  <span className="absolute bottom-[-6px] top-4 w-px bg-blue-200" />
                ) : null}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {label}
                </p>
                <p className="mt-1 font-semibold text-slate-900">{location}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {formatCarDate(date, locale)}
                  {time ? ` · ${time}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
        {!mapUrl && directionsUrl ? (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring flex min-h-11 items-center justify-between border-t border-slate-200 px-4 text-sm font-bold text-blue hover:bg-slate-50"
          >
            {copy("carDetails.getDirections")}
            <ExternalLink size={16} aria-hidden="true" />
          </a>
        ) : null}
      </div>
      <div className="mt-7">
        <h3 className="text-base font-bold text-slate-950">
          {copy("carDetails.pickupLocationDetails")}
        </h3>
        <ul className="mt-3 list-disc space-y-2 ps-5 text-sm leading-6 text-slate-700">
          {car.pickupInstructions ? <li>{car.pickupInstructions}</li> : null}
          <li>{copy("carDetails.confirmPickupDetails")}</li>
        </ul>
      </div>
    </div>
  );
}

function BookingSummary({
  offer,
  days,
  price,
  copy,
  action,
}: {
  offer: CarOffer;
  days: number;
  price: PriceFn;
  copy: (k: string) => string;
  action: CarDetailsPrimaryAction;
}) {
  const daily = price(offer.pricePerDay, offer.currency),
    total = price(offer.totalPrice, offer.currency);
  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">
        {copy("carDetails.bookingSummary")}
      </p>
      <p
        className="mt-3 overflow-hidden text-ellipsis whitespace-nowrap text-xl font-extrabold tabular-nums text-[#102A43] sm:text-2xl"
        dir="ltr"
        title={total.title}
        aria-label={total.ariaLabel}
      >
        {total.formatted}
      </p>
      <p className="text-sm text-slate-500">
        {days} {days === 1 ? copy("carDetails.day") : copy("carDetails.days")}
      </p>
      <p
        className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm tabular-nums text-slate-600"
        dir="ltr"
        title={daily.title}
        aria-label={daily.ariaLabel}
      >
        {daily.formatted} {copy("carsResults.perDay")}
      </p>
      {action.kind === "standalone-disabled-provider" ? (
        <button
          disabled
          className="mt-5 w-full rounded-lg bg-teal-dark px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {action.label}
        </button>
      ) : (
        <div className="mt-5" aria-live="polite">
          <button
            id={getDealsGuidedConfirmationActionId("car")}
            type="button"
            disabled={!action.enabled || action.pending}
            aria-label={action.accessibleLabel}
            onClick={action.onActivate}
            className="focus-ring min-h-11 w-full rounded-lg bg-teal-dark px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {action.pending
              ? copy("deals.guided.carDetails.saving")
              : action.label}
          </button>
          {!action.enabled && !action.error ? (
            <p className="mt-2 text-sm text-slate-600">
              {action.unavailableMessage}
            </p>
          ) : null}
          {action.error ? (
            <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
              {action.error}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function PickupReturnSection({
  car,
  search,
  locale,
  copy,
  sectionHeadingLevel,
  itemHeadingLevel,
}: {
  car: NormalizedCarResult;
  search: CarSearchParams;
  locale: string;
  copy: (key: string) => string;
  sectionHeadingLevel: HeadingLevel;
  itemHeadingLevel: HeadingLevel;
}) {
  return (
    <section className="border-y border-slate-200 bg-white py-5 sm:rounded-[13px] sm:border sm:p-6 sm:shadow-[0_3px_15px_rgba(15,23,42,0.04)]">
      <Heading
        level={sectionHeadingLevel}
        className="text-lg font-bold tracking-[-0.015em] text-[#102A43] sm:text-xl"
      >
        {copy("carDetails.pickupReturn")}
      </Heading>
      <div className="relative mt-4 grid gap-5 md:grid-cols-2 md:gap-6">
        {[
          [
            copy("carDetails.pickup"),
            car.pickupLocation,
            search.pickupDate,
            search.pickupTime,
          ],
          [
            copy("carDetails.return"),
            car.returnLocation,
            search.dropoffDate,
            search.dropoffTime,
          ],
        ].map(([label, location, date, time]) => (
          <div key={label} className="relative border-s-2 border-blue-200 ps-5">
            <span className="absolute -start-[7px] top-1 size-3 rounded-full bg-[#004BB8]" />
            <Heading level={itemHeadingLevel} className="font-bold">
              {label}
            </Heading>
            <p className="mt-1 flex gap-2 text-sm">
              <MapPin size={16} className="shrink-0 text-[#004BB8]" />
              {location || copy("carDetails.locationUnavailable")}
            </p>
            <p className="mt-1 flex gap-2 text-sm text-slate-600">
              <Clock3 size={16} />
              <time dateTime={`${date}T${time}`}>
                {formatCarDate(date, locale)}
                {time ? ` · ${time}` : ""}
              </time>
            </p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm font-medium">
        {pickupTypeLabels[car.pickupType]}
        {car.shuttleRequired ? ` · ${copy("carDetails.shuttleRequired")}` : ""}
      </p>
      {car.pickupInstructions && (
        <p className="mt-2 text-sm">
          <strong>{copy("carDetails.pickupInstructions")}:</strong>{" "}
          {car.pickupInstructions}
        </p>
      )}
    </section>
  );
}

function MobileBookingDock({
  offer,
  days,
  price,
  copy,
  action,
}: {
  offer: CarOffer;
  days: number;
  price: PriceFn;
  copy: (k: string) => string;
  action: CarDetailsPrimaryAction;
}) {
  const daily = price(offer.pricePerDay, offer.currency),
    total = price(offer.totalPrice, offer.currency);
  return (
    <section
      className="fixed inset-x-0 bottom-0 z-[90] rounded-t-[22px] border-t border-slate-200 bg-white px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_28px_rgba(15,23,42,0.14)] lg:hidden"
      aria-labelledby="mobile-car-rental-total-heading"
      data-mobile-car-booking-dock
    >
      <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)_minmax(132px,0.9fr)] items-center gap-3">
        <div className="min-w-0">
          <h2
            id="mobile-car-rental-total-heading"
            className="text-[11px] font-semibold leading-4 text-slate-600"
          >
            {copy("carDetails.bookingSummary")}
          </h2>
          <p
            className="truncate text-[clamp(1.25rem,6vw,1.5rem)] font-extrabold leading-tight text-slate-950"
            dir="ltr"
            title={total.title}
            aria-label={total.ariaLabel}
          >
            {total.formatted}
          </p>
          <p className="truncate text-[11px] text-slate-600">
            <span>
              {days}{" "}
              {days === 1 ? copy("carDetails.day") : copy("carDetails.days")}
            </span>
            <span aria-hidden="true"> · </span>
            <span dir="ltr" title={daily.title} aria-label={daily.ariaLabel}>
              {daily.formatted} {copy("carsResults.perDay")}
            </span>
          </p>
        </div>
        {action.kind === "standalone-disabled-provider" ? (
          <button
            disabled
            className="min-h-12 w-full rounded-lg bg-teal-dark px-3 text-xs font-bold leading-4 text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {action.label}
          </button>
        ) : null}
      </div>
    </section>
  );
}
