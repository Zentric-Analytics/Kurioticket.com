"use client";

import type { ReactNode, Ref } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Clock3,
  ExternalLink,
  Fuel,
  Gauge,
  Heart,
  MapPin,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { sandboxBookingUrl } from "@/services/travel/kayakSandboxPublic";

export type CarDetailsPrimaryAction =
  | { kind: "standalone-disabled-provider"; label: string }
  | { kind: "sandbox-handoff"; label: string; href: string }
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
  mobileBackControl,
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
  mobileBackControl?: ReactNode;
}) {
  const { locale, t } = useLocale();
  const { selectedOption } = useRegion();
  const rates = useCurrencyRates();
  const { isSaved, toggleSavedCar } = useSavedCar(car, search);
  const [activeTab, setActiveTab] = useState<CarDetailsTab>("compare");
  const [shareConfirmation, setShareConfirmation] = useState("");
  const [mobileHeaderProtected, setMobileHeaderProtected] = useState(false);
  const mobileHeaderProtectedRef = useRef(false);
  const mobileHeaderRef = useRef<HTMLDivElement>(null);
  const heroImageStageRef = useRef<HTMLElement>(null);
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
  useEffect(() => {
    if (presentation !== "standalone-content") return;

    let animationFrame = 0;
    const protectionLead = 16;
    const protectionHysteresis = 12;

    const syncProtection = () => {
      animationFrame = 0;
      const imageStage = heroImageStageRef.current;
      const protectedHeader = mobileHeaderRef.current;
      if (!imageStage || !protectedHeader) return;

      const headerBottom = protectedHeader.getBoundingClientRect().bottom;
      const imageBottom = imageStage.getBoundingClientRect().bottom;
      const threshold = mobileHeaderProtectedRef.current
        ? headerBottom + protectionLead + protectionHysteresis
        : headerBottom + protectionLead;
      const nextProtected = imageBottom <= threshold;
      if (nextProtected === mobileHeaderProtectedRef.current) return;
      mobileHeaderProtectedRef.current = nextProtected;
      setMobileHeaderProtected(nextProtected);
    };
    const scheduleProtectionSync = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(syncProtection);
    };

    syncProtection();
    window.addEventListener("scroll", scheduleProtectionSync, {
      passive: true,
    });
    window.addEventListener("resize", scheduleProtectionSync);
    return () => {
      window.removeEventListener("scroll", scheduleProtectionSync);
      window.removeEventListener("resize", scheduleProtectionSync);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [presentation]);
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
      {presentation === "standalone-content" ? (
        <div
          ref={mobileHeaderRef}
          className={`pointer-events-none fixed inset-x-0 top-0 z-40 h-[calc(env(safe-area-inset-top)+4.375rem)] transition-colors duration-150 lg:hidden ${mobileHeaderProtected ? "bg-[#F5F7FB]" : "bg-transparent"}`}
          data-car-details-mobile-controls
          data-protected={mobileHeaderProtected ? "true" : "false"}
        >
          <div className="absolute inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] flex items-start justify-between pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
            <div className="pointer-events-auto">{mobileBackControl}</div>
            <div className="pointer-events-auto">
              <CarHeroActions
                car={car}
                isSaved={isSaved}
                toggleSavedCar={toggleSavedCar}
                shareCar={shareCar}
                copy={copy}
              />
            </div>
          </div>
        </div>
      ) : null}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div
          className={`min-w-0 ${presentation === "standalone-content" ? "space-y-0 lg:space-y-5" : "space-y-4 lg:space-y-5"}`}
        >
          <CarDetailsHero
            car={car}
            text={text}
            imageStageRef={heroImageStageRef}
            identity={
              <div className="min-w-0">
                <Heading
                  level={modelHeadingLevel}
                  headingRef={modelHeadingRef}
                  className="scroll-mt-24 text-[22px] font-extrabold leading-7 tracking-[-0.025em] text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-[#075EE8]"
                >
                  {car.modelName}
                  {car.orSimilar ? (
                    <span className="ms-1.5 inline text-sm font-semibold leading-5 tracking-normal text-slate-500">
                      or similar
                    </span>
                  ) : null}
                </Heading>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#075EE8]">
                  {car.categoryLabel}
                </p>
              </div>
            }
            desktopOverlay={
              <div className="flex min-w-0 items-start justify-between gap-3 text-white">
                <div className="min-w-0 pt-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-[.14em] text-white/85">
                    {car.categoryLabel}
                  </p>
                  <Heading
                    level={modelHeadingLevel}
                    headingRef={modelHeadingRef}
                    className="mt-0.5 scroll-mt-24 text-3xl font-extrabold leading-tight tracking-[-0.025em] text-white outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {car.modelName}
                  </Heading>
                </div>
                <CarHeroActions
                  car={car}
                  isSaved={isSaved}
                  toggleSavedCar={toggleSavedCar}
                  shareCar={shareCar}
                  copy={copy}
                  desktop
                />
              </div>
            }
            guidedMobileActions={
              presentation === "guided-content" ? (
                <CarHeroActions
                  car={car}
                  isSaved={isSaved}
                  toggleSavedCar={toggleSavedCar}
                  shareCar={shareCar}
                  copy={copy}
                />
              ) : undefined
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
                  mobileCompare: "Compare deals",
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

function CarHeroActions({
  car,
  isSaved,
  toggleSavedCar,
  shareCar,
  copy,
  desktop = false,
}: {
  car: NormalizedCarResult;
  isSaved: boolean;
  toggleSavedCar: () => void;
  shareCar: () => Promise<void>;
  copy: (key: string) => string;
  desktop?: boolean;
}) {
  return (
    <div
      className={
        desktop
          ? "flex shrink-0 items-center gap-1"
          : "flex h-11 shrink-0 items-center overflow-hidden rounded-full border border-white/70 bg-white/85 shadow-[0_2px_7px_rgba(15,23,42,0.08)] backdrop-blur-md"
      }
      data-car-details-actions
    >
      <button
        type="button"
        aria-label={`${isSaved ? copy("carDetails.unsave") : copy("carDetails.save")} ${car.modelName}`}
        aria-pressed={isSaved}
        onClick={toggleSavedCar}
        className={`focus-ring flex size-11 items-center justify-center transition ${desktop ? "rounded-full border border-white/35 bg-slate-950/35 hover:bg-slate-950/55" : "bg-transparent hover:bg-white/70"} ${isSaved ? "text-rose-500" : desktop ? "text-white" : "text-slate-700"}`}
      >
        <Heart
          size={desktop ? 20 : 22}
          fill={isSaved ? "currentColor" : "none"}
          aria-hidden="true"
        />
      </button>
      <button
        type="button"
        aria-label={`${copy("carDetails.share")} ${car.modelName}`}
        onClick={() => void shareCar()}
        className={`focus-ring flex size-11 items-center justify-center transition ${desktop ? "rounded-full border border-white/35 bg-slate-950/35 text-white hover:bg-slate-950/55" : "bg-transparent text-slate-700 hover:bg-white/70"}`}
      >
        <Share2 size={desktop ? 19 : 21} aria-hidden="true" />
      </button>
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
  const sandboxHref =
    car.inventorySource === "kayak-sandbox"
      ? sandboxBookingUrl(getPrimaryCarOffer(car)?.bookingUrl)
      : null;
  const primaryAction: CarDetailsPrimaryAction = sandboxHref
    ? {
        kind: "sandbox-handoff",
        label: "Open KAYAK test page",
        href: sandboxHref,
      }
    : {
        kind: "standalone-disabled-provider",
        label: copy("carDetails.continueDeal"),
      };
  return (
    <main className="flex-1 bg-[#F5F7FB] pb-[calc(7.5rem+env(safe-area-inset-bottom))] lg:bg-surface-muted/40 lg:pb-0">
      <section className="bg-transparent lg:bg-white lg:border-b lg:border-border lg:pb-14">
        <div className="page-shell py-0 lg:py-7">
          <DetailsBackLink
            href={resultsHref}
            className="hidden text-[#075EE8] hover:text-[#004BB8] lg:inline-flex"
          >
            {copy("carDetails.backToResults")}
          </DetailsBackLink>
          <div className="lg:mt-5">
            <CarDetailsExperience
              car={car}
              search={search}
              presentation="standalone-content"
              primaryAction={primaryAction}
              mobileBackControl={
                <Link
                  href={resultsHref}
                  aria-label="Back to Cars results"
                  className="focus-ring flex size-11 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/85 text-slate-900 shadow-[0_2px_7px_rgba(15,23,42,0.08)] backdrop-blur-md"
                  data-car-details-mobile-back
                >
                  <ArrowLeft size={25} strokeWidth={2.2} aria-hidden="true" />
                </Link>
              }
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
  const facts = car.sandboxPresentation
    ? [
        { label: "KAYAK sandbox", Icon: ShieldCheck },
        { label: "Simulated inventory — no real booking", Icon: Gauge },
      ]
    : [
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
      className="border-b border-slate-200 bg-[#F5F7FB] pb-7 pt-3 lg:bg-transparent"
      data-car-price-comparison
    >
      <Heading
        level={headingLevel}
        className="text-xs font-bold tracking-[-0.0125em] text-slate-950 lg:text-xl lg:font-extrabold lg:tracking-tight"
      >
        <span className="lg:hidden">Compare deals</span>
        <span className="hidden lg:inline">
          {copy("carDetails.comparePrices")}
        </span>
      </Heading>
      <p className="mt-1 text-sm font-medium text-slate-600">
        {formatCarDate(search.pickupDate, locale)} –{" "}
        {formatCarDate(search.dropoffDate, locale)} · {days}{" "}
        {days === 1 ? copy("carDetails.day") : copy("carDetails.days")}
      </p>
      <div className="mt-5 rounded-[14px] border border-[#075EE8] bg-white px-2 py-3 ring-1 ring-[#075EE8]/10 lg:px-4 lg:py-4">
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
          <div className="col-span-2 mt-3 flex min-w-0 items-end gap-x-2 overflow-visible lg:mt-5 lg:gap-x-4">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1.5 lg:flex-nowrap lg:items-end lg:gap-x-4 lg:overflow-x-auto lg:overflow-y-hidden lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden">
              {facts.map(({ label, Icon }) => (
                <span
                  key={label}
                  className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[11px] font-semibold text-slate-700 sm:gap-1.5 sm:text-xs"
                >
                  <Icon
                    size={14}
                    strokeWidth={2}
                    className="shrink-0 text-slate-600"
                    aria-hidden="true"
                  />
                  {label}
                </span>
              ))}
            </div>
            <span className="ms-auto inline-flex min-h-9 shrink-0 flex-col items-end justify-end overflow-visible whitespace-nowrap text-right">
              <strong
                className="text-xl font-extrabold leading-5 tracking-tight text-slate-950 tabular-nums"
                dir="ltr"
                title={daily.title}
                aria-label={daily.ariaLabel}
              >
                {daily.formatted}
              </strong>
              <span className="inline-flex min-h-4 items-center overflow-visible text-[11px] font-medium leading-4 text-[#075EE8] sm:text-xs">
                {copy("carsResults.perDay")}
              </span>
            </span>
          </div>
        </div>
      </div>
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
      className="border-b border-slate-200 bg-[#F5F7FB] pb-7 pt-3 lg:bg-transparent"
      data-car-location-section
    >
      <Heading
        level={headingLevel}
        className="text-xs font-bold tracking-[-0.0125em] text-slate-950 lg:text-xl lg:font-extrabold lg:tracking-tight"
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
            {car.sandboxPresentation?.pickupLabel ??
              pickupTypeLabels[car.pickupType]}
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
      {action.kind === "sandbox-handoff" ? (
        <a
          href={action.href}
          target="_blank"
          rel="noopener noreferrer"
          referrerPolicy="no-referrer"
          className="mt-5 block w-full rounded-lg bg-blue px-4 py-3 text-center font-bold text-white"
        >
          {action.label}
        </a>
      ) : action.kind === "standalone-disabled-provider" ? (
        <button
          disabled
          className="mt-5 w-full rounded-lg bg-blue px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-100"
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
    <section className="-mx-4 border-y border-slate-200 bg-[#F5F7FB] px-4 py-5 lg:mx-0 lg:rounded-[13px] lg:border lg:bg-white lg:p-6 lg:shadow-[0_3px_15px_rgba(15,23,42,0.04)]">
      <Heading
        level={sectionHeadingLevel}
        className="text-xs font-bold tracking-[-0.0125em] text-[#102A43] lg:text-xl lg:tracking-[-0.015em]"
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
        {car.sandboxPresentation?.pickupLabel ??
          pickupTypeLabels[car.pickupType]}
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
  const total = price(offer.totalPrice, offer.currency);
  return (
    <section
      className="fixed inset-x-0 bottom-0 z-[90] rounded-t-[22px] border-t border-slate-200 bg-white px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_28px_rgba(15,23,42,0.14)] lg:hidden"
      aria-labelledby="mobile-car-rental-total-heading"
      data-mobile-car-booking-dock
    >
      <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)_minmax(132px,0.9fr)] items-center gap-3">
        <div className="min-w-0">
          <p
            className="truncate text-[clamp(1.2rem,5.5vw,1.5rem)] font-semibold leading-[22px] tracking-[-0.015em] text-slate-950"
            dir="ltr"
            title={total.title}
            aria-label={total.ariaLabel}
          >
            {total.formatted}
          </p>
          <h2
            id="mobile-car-rental-total-heading"
            className="truncate text-[11px] font-semibold leading-4 text-slate-600"
          >
            {copy("carDetails.bookingSummary")}
          </h2>
        </div>
        {action.kind === "sandbox-handoff" ? (
          <a
            href={action.href}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
            className="focus-ring inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-blue px-3 text-center text-xs font-bold leading-4 text-white"
          >
            {action.label}
          </a>
        ) : action.kind === "standalone-disabled-provider" ? (
          <button
            disabled
            className="focus-ring min-h-12 w-full rounded-lg bg-blue px-3 text-xs font-bold leading-4 text-white disabled:cursor-not-allowed disabled:opacity-100"
          >
            {action.label}
          </button>
        ) : null}
      </div>
    </section>
  );
}
