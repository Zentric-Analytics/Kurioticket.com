"use client";

import type { MouseEvent as ReactMouseEvent, ReactNode, Ref } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CarFront,
  Clock3,
  ExternalLink,
  Fuel,
  Gauge,
  Heart,
  IdCard,
  MapPin,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRouteProgress } from "@/components/layout/RouteProgress";
import { useRegion } from "@/components/region/RegionProvider";
import { CarsRouteLoadingOverlay } from "@/components/results/CarsRouteLoadingOverlay";
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
import { calculateRentalDays, getComparisonCarOffers, getPrimaryCarOffer } from "@/lib/cars/carResults";
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

const providerValue = (value?: string) => {
  const trimmed = value?.trim() || "";
  return trimmed === "Supplier not supplied" || trimmed === "KAYAK sandbox"
    ? ""
    : trimmed;
};

const compactBookingProviderName = (offer: CarOffer) => {
  const provider =
    providerValue(offer.bookingProviderName) ||
    providerValue(offer.rentalCompanyName);
  return provider === "Kurioticket static fixture" ? "Kurioticket" : provider;
};

function CarOfferProviderBrand({
  car,
  offer,
  providerName,
  compact = false,
}: {
  car: NormalizedCarResult;
  offer: CarOffer;
  providerName: string;
  compact?: boolean;
}) {
  const logoUrl =
    car.inventorySource === "kurioticket-static-cars"
      ? "/brand/kurioticket-logo-primary-light-bg.svg"
      : offer.bookingProviderLogoUrl;
  if (logoUrl) {
    return (
      <span
        className={`inline-flex shrink-0 items-center overflow-hidden ${compact ? "h-6 max-w-[108px]" : "h-7 max-w-[132px]"}`}
        data-car-offer-provider-brand
      >
        <Image
          src={logoUrl}
          alt={`${providerName || "Booking provider"} logo`}
          width={compact ? 108 : 132}
          height={compact ? 24 : 30}
          className={`w-auto object-contain object-left ${compact ? "max-h-6 max-w-[108px]" : "max-h-7 max-w-[132px]"}`}
        />
      </span>
    );
  }
  return (
    <span
      className={`min-w-0 truncate font-semibold text-[#192024] ${compact ? "text-[13px] leading-[18px]" : "text-[15px] leading-5"}`}
      data-car-offer-provider-brand-fallback
    >
      {providerName || "Booking provider"}
    </span>
  );
}

const unavailableOfferLabel = "Offer currently unavailable";
const unavailableBookingMessage =
  "This offer is not currently available to book";

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
  desktopBackControl,
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
  desktopBackControl?: ReactNode;
}) {
  const { locale, t } = useLocale();
  const { selectedOption } = useRegion();
  const rates = useCurrencyRates();
  const { isSaved, toggleSavedCar } = useSavedCar(car, search);
  const [activeTab, setActiveTab] = useState<CarDetailsTab>("compare");
  const [desktopSectionBarStuck, setDesktopSectionBarStuck] = useState(false);
  const [shareConfirmation, setShareConfirmation] = useState("");
  const mobileHeaderProtectedRef = useRef(false);
  const mobileHeaderRef = useRef<HTMLDivElement>(null);
  const heroImageStageRef = useRef<HTMLElement>(null);
  const desktopSectionBarRef = useRef<HTMLDivElement>(null);
  const compareSectionRef = useRef<HTMLElement>(null);
  const pickupSectionRef = useRef<HTMLDivElement>(null);
  const locationSectionRef = useRef<HTMLElement>(null);
  const [mobileHeaderProtected, setMobileHeaderProtected] = useState(false);
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
  const canonicalPrimaryOffer = suppliedPrimaryOffer ?? getPrimaryCarOffer(car);
  const comparisonOffers = useMemo(
    () => getComparisonCarOffers(car.offers),
    [car.offers],
  );
  const [selectedOfferId, setSelectedOfferId] = useState<string | undefined>(
    () => canonicalPrimaryOffer?.id,
  );
  useEffect(() => {
    if (presentation !== "standalone-content") {
      setSelectedOfferId(canonicalPrimaryOffer?.id);
      return;
    }
    if (
      selectedOfferId &&
      comparisonOffers.some((candidate) => candidate.id === selectedOfferId)
    ) {
      return;
    }
    const nextOffer =
      (canonicalPrimaryOffer &&
      comparisonOffers.some((candidate) => candidate.id === canonicalPrimaryOffer.id)
        ? canonicalPrimaryOffer
        : comparisonOffers[0]) ?? canonicalPrimaryOffer;
    setSelectedOfferId(nextOffer?.id);
  }, [
    canonicalPrimaryOffer,
    comparisonOffers,
    presentation,
    selectedOfferId,
  ]);
  const primaryOffer =
    presentation === "standalone-content"
      ? comparisonOffers.find((candidate) => candidate.id === selectedOfferId) ??
        canonicalPrimaryOffer
      : canonicalPrimaryOffer;
  const standaloneSandbox =
    presentation === "standalone-content" &&
    car.inventorySource === "kayak-sandbox";
  const selectedSandboxHref = standaloneSandbox
    ? sandboxBookingUrl(primaryOffer?.bookingUrl)
    : null;
  const effectivePrimaryAction: CarDetailsPrimaryAction = standaloneSandbox
    ? selectedSandboxHref
      ? {
          kind: "sandbox-handoff",
          label: copy("carDetails.continueDeal"),
          href: selectedSandboxHref,
        }
      : {
          kind: "standalone-disabled-provider",
          label: copy("carDetails.continueDeal"),
        }
    : primaryAction;
  const actionForOffer = (offer: CarOffer): CarDetailsPrimaryAction => {
    if (!standaloneSandbox) {
      return effectivePrimaryAction;
    }
    const href = sandboxBookingUrl(offer.bookingUrl);
    return href
      ? {
          kind: "sandbox-handoff",
          label: copy("carDetails.continueDeal"),
          href,
        }
      : {
          kind: "standalone-disabled-provider",
          label: copy("carDetails.continueDeal"),
        };
  };
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

  useEffect(() => {
    if (presentation !== "standalone-content") return;

    let animationFrame = 0;
    const desktopQuery = window.matchMedia("(min-width: 1024px)");

    const updateDesktopScrollState = () => {
      animationFrame = 0;
      if (!desktopQuery.matches) {
        setDesktopSectionBarStuck(false);
        return;
      }

      const barBounds = desktopSectionBarRef.current?.getBoundingClientRect();
      const stuck = Boolean(barBounds && barBounds.top <= 0);
      setDesktopSectionBarStuck(stuck);

      const threshold = (barBounds?.height ?? 64) + 24;
      const sections: Array<{ id: CarDetailsTab; element: HTMLElement | null }> = [
        { id: "compare", element: compareSectionRef.current },
        { id: "pickup", element: pickupSectionRef.current },
        { id: "location", element: locationSectionRef.current },
      ];
      let current: CarDetailsTab = "compare";
      for (const section of sections) {
        if ((section.element?.getBoundingClientRect().top ?? Infinity) <= threshold) {
          current = section.id;
        }
      }
      if (
        window.scrollY > 0 &&
        Math.ceil(window.scrollY + window.innerHeight) >=
          document.documentElement.scrollHeight - 2
      ) {
        current = "location";
      }
      setActiveTab(current);
    };

    const scheduleDesktopScrollState = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updateDesktopScrollState);
    };

    scheduleDesktopScrollState();
    window.addEventListener("scroll", scheduleDesktopScrollState, { passive: true });
    window.addEventListener("resize", scheduleDesktopScrollState);
    desktopQuery.addEventListener("change", scheduleDesktopScrollState);

    const observer = new ResizeObserver(scheduleDesktopScrollState);
    for (const target of [
      desktopSectionBarRef.current,
      compareSectionRef.current,
      pickupSectionRef.current,
      locationSectionRef.current,
    ]) {
      if (target) observer.observe(target);
    }

    return () => {
      window.removeEventListener("scroll", scheduleDesktopScrollState);
      window.removeEventListener("resize", scheduleDesktopScrollState);
      desktopQuery.removeEventListener("change", scheduleDesktopScrollState);
      observer.disconnect();
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [presentation]);

  function handleSectionChange(tab: CarDetailsTab) {
    setActiveTab(tab);
    if (
      presentation !== "standalone-content" ||
      !window.matchMedia("(min-width: 1024px)").matches
    ) {
      return;
    }

    const target =
      tab === "compare"
        ? compareSectionRef.current
        : tab === "pickup"
          ? pickupSectionRef.current
          : locationSectionRef.current;
    target?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }

  const pickupSection = (
    <PickupReturnSection
      car={car}
      search={search}
      locale={locale}
      copy={copy}
      sectionHeadingLevel={sectionHeadingLevel}
      itemHeadingLevel={itemHeadingLevel}
      showSectionHeading
    />
  );
  return (
    <div
      className={`${presentation === "guided-content" ? "mt-6" : "car-details-standalone-typography"} font-sans [--car-details-mobile-header-boundary:calc(env(safe-area-inset-top)+4.375rem)]`}
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
          className="hidden h-16 w-full items-center border-b border-transparent bg-[#F5F7FB] lg:flex lg:bg-[#F8FAFC]"
          data-car-details-desktop-controls
        >
          <div className="mx-auto flex w-full max-w-[820px] items-center justify-between px-2">
            <div className="relative z-10">{desktopBackControl}</div>
            <div
              className="relative z-10 flex items-center gap-2"
              data-car-details-utility-placement="hero"
            >
              <CarHeroActions
                car={car}
                isSaved={isSaved}
                toggleSavedCar={toggleSavedCar}
                shareCar={shareCar}
                copy={copy}
                desktop
              />
            </div>
          </div>
        </div>
      ) : null}
      {presentation === "standalone-content" ? (
        <div
          ref={mobileHeaderRef}
          className={`pointer-events-none fixed inset-x-0 top-0 z-40 h-[var(--car-details-mobile-header-boundary)] transition-colors duration-150 lg:hidden ${mobileHeaderProtected ? "bg-[#F5F7FB]" : "bg-transparent"}`}
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
      <div
        className={`grid items-start gap-5 ${presentation === "standalone-content" ? "lg:grid-cols-1 lg:gap-0" : "lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"}`}
        data-car-details-content-grid
      >
        <div
          className={`min-w-0 ${presentation === "standalone-content" ? "space-y-0 lg:mx-auto lg:w-full lg:max-w-[1080px] lg:space-y-5" : "space-y-4 lg:space-y-5"}`}
          data-car-details-primary-column
        >
          <CarDetailsHero
            car={car}
            text={text}
            imageStageRef={heroImageStageRef}
            reserveMobileControlSafeZone={presentation === "standalone-content"}
            identity={
              <div className="min-w-0">
                <Heading
                  level={modelHeadingLevel}
                  headingRef={modelHeadingRef}
                  className={`scroll-mt-24 text-[22px] font-extrabold leading-7 tracking-[-0.5px] text-[#071A48] outline-none focus-visible:ring-2 focus-visible:ring-[#075EE8] ${presentation === "standalone-content" ? "lg:text-[24px] lg:font-bold lg:leading-[30px] lg:tracking-[-0.35px] lg:text-[#192024]" : "lg:text-slate-950"}`}
                >
                  {car.modelName}
                  {car.orSimilar ? (
                    <span className={`ms-1.5 inline text-sm font-semibold leading-5 tracking-normal text-[#56658E] ${presentation === "standalone-content" ? "lg:text-[14px] lg:font-normal lg:leading-[22px] lg:text-[#59636A]" : "lg:text-slate-500"}`}>
                      or similar
                    </span>
                  ) : null}
                </Heading>
                <p className={`mt-0.5 text-[10px] font-bold uppercase leading-[14px] tracking-[.14em] text-[#075EE8] ${presentation === "standalone-content" ? "lg:mt-1.5 lg:text-[11px] lg:leading-4 lg:tracking-[0.14em]" : ""}`}>
                  {car.categoryLabel}
                </p>
              </div>
            }
            desktopOverlay={
              presentation === "guided-content" ? (
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
              ) : undefined
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
                onTabChange={handleSectionChange}
                desktopBarRef={desktopSectionBarRef}
                desktopStuck={desktopSectionBarStuck}
                desktopBackControl={desktopBackControl}
                desktopUtilityActions={
                  <div
                    className="flex items-center gap-4 xl:gap-5"
                    data-car-details-utility-placement="tabs"
                  >
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
                labels={{
                  navigation: copy("carDetails.title"),
                  compare: "Compare deals",
                  mobileCompare: "Compare deals",
                  pickup: copy("carDetails.pickupReturn"),
                  location: copy("carDetails.location"),
                }}
              />
              <div className="min-h-[240px]" data-car-details-section-panels>
                <div className="lg:hidden" data-car-details-mobile-section-panels>
                  <section
                    id="car-compare-panel"
                    role="tabpanel"
                    aria-labelledby="car-compare-tab"
                    className={activeTab !== "compare" ? "hidden" : ""}
                    data-car-details-scroll-section="compare"
                  >
                    {primaryOffer ? (
                      <CarPriceComparisonSection
                        car={car}
                        search={search}
                        offers={comparisonOffers.length ? comparisonOffers : [primaryOffer]}
                        selectedOfferId={primaryOffer.id}
                        onSelectOffer={setSelectedOfferId}
                        days={days}
                        price={price}
                        copy={copy}
                        locale={locale}
                        headingLevel={sectionHeadingLevel}
                        showSectionHeading
                        actionForOffer={actionForOffer}
                      />
                    ) : null}
                  </section>
                  <div
                    id="car-pickup-panel"
                    role="tabpanel"
                    aria-labelledby="car-pickup-tab"
                    className={activeTab !== "pickup" ? "hidden" : ""}
                    data-car-details-scroll-section="pickup"
                  >
                    {pickupSection}
                  </div>
                  <section
                    id="car-location-panel"
                    role="tabpanel"
                    aria-labelledby="car-location-tab"
                    className={activeTab !== "location" ? "hidden" : ""}
                    data-car-details-scroll-section="location"
                  >
                    <CarLocationSection
                      car={car}
                      search={search}
                      locale={locale}
                      copy={copy}
                      headingLevel={sectionHeadingLevel}
                      showSectionHeading
                    />
                  </section>
                </div>

                <div className="hidden lg:block" data-car-details-desktop-linear-sections>
                  <section
                    ref={compareSectionRef}
                    className="pt-2"
                    data-car-details-scroll-section="compare"
                    data-car-details-desktop-section="compare"
                  >
                    {primaryOffer ? (
                      <CarPriceComparisonSection
                        car={car}
                        search={search}
                        offers={comparisonOffers.length ? comparisonOffers : [primaryOffer]}
                        selectedOfferId={primaryOffer.id}
                        onSelectOffer={setSelectedOfferId}
                        days={days}
                        price={price}
                        copy={copy}
                        locale={locale}
                        headingLevel={sectionHeadingLevel}
                        showSectionHeading
                        showDesktopOfferList
                        actionForOffer={actionForOffer}
                      />
                    ) : null}
                  </section>

                  <section
                    ref={pickupSectionRef}
                    className="pt-3"
                    data-car-details-scroll-section="pickup"
                    data-car-details-desktop-section="pickup"
                  >
                    <DesktopPickupReturnOverview
                      car={car}
                      search={search}
                      locale={locale}
                      copy={copy}
                    />
                  </section>

                  <section
                    ref={locationSectionRef}
                    className="pt-3"
                    data-car-details-scroll-section="location"
                    data-car-details-desktop-section="location"
                  >
                    <DesktopCarHireLocationOverview
                      car={car}
                      search={search}
                      locale={locale}
                      copy={copy}
                    />
                  </section>

                </div>
              </div>
            </>
          ) : (
            pickupSection
          )}
        </div>
        {primaryOffer && presentation !== "standalone-content" ? (
          <aside
            className="self-start lg:sticky lg:top-24"
            data-car-details-booking-rail
          >
            <BookingSummary
              offer={primaryOffer}
              days={days}
              price={price}
              copy={copy}
              action={effectivePrimaryAction}
              showRentalBreakdown
            />
          </aside>
        ) : null}
      </div>
      {presentation === "standalone-content" && primaryOffer ? (
        <MobileBookingDock
          offer={primaryOffer}
          days={days}
          price={price}
          copy={copy}
          action={effectivePrimaryAction}
        />
      ) : null}
    </div>
  );
}

function DesktopPickupReturnOverview({
  car,
  search,
  locale,
  copy,
}: {
  car: NormalizedCarResult;
  search: CarSearchParams;
  locale: string;
  copy: (key: string) => string;
}) {
  const pickupType =
    car.sandboxPresentation?.pickupLabel ?? pickupTypeLabels[car.pickupType];

  return (
    <div
      className="mx-auto w-full max-w-[900px] py-1"
      data-car-details-desktop-pickup-overview
    >
      <h2 className="car-details-desktop-section-heading-type">Pickup and return</h2>
      <div className="mt-4 grid grid-cols-2 divide-x divide-slate-200" data-car-details-desktop-pickup-columns>
        {[
          [copy("carDetails.pickup"), car.pickupLocation, search.pickupDate, search.pickupTime],
          [copy("carDetails.return"), car.returnLocation, search.dropoffDate, search.dropoffTime],
        ].map(([label, location, date, time]) => (
          <div
            key={label}
            className="min-w-0 px-6 py-1 first:pl-0 last:pr-0"
          >
            <p className="car-details-desktop-item-heading-type">{label}</p>
            <p className="car-details-desktop-primary-copy-type mt-2 flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0 text-[#075EE8]" aria-hidden="true" />
              <span>{location || copy("carDetails.locationUnavailable")}</span>
            </p>
            <p className="car-details-desktop-secondary-copy-type mt-2 flex items-start gap-2">
              <Clock3 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <time dateTime={`${date}T${time}`}>
                {formatCarDate(date, locale)}
                {time ? ` · ${time}` : ""}
              </time>
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-slate-200 pt-4">
        <p className="car-details-desktop-strong-copy-type">{pickupType}</p>
        {car.shuttleRequired ? (
          <p className="car-details-desktop-primary-copy-type mt-1">
            {copy("carDetails.shuttleRequired")}
          </p>
        ) : null}
        {car.pickupInstructions ? (
          <p className="car-details-desktop-primary-copy-type mt-2">
            <strong>{copy("carDetails.pickupInstructions")}:</strong>{" "}
            {car.pickupInstructions}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function DesktopCarHireLocationOverview({
  car,
  search,
  copy,
}: {
  car: NormalizedCarResult;
  search: CarSearchParams;
  locale: string;
  copy: (key: string) => string;
}) {
  const pickupLocation =
    search.pickupLocation.trim() ||
    car.pickupLocation ||
    copy("carDetails.locationUnavailable");
  const mapUrl = buildGoogleCarMapEmbedUrl({
    pickupLocation: search.pickupLocation.trim() || car.pickupLocation,
    googleMapsEmbedApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY,
  });
  const directionsUrl = buildCarDirectionsUrl(
    search.pickupLocation.trim() || car.pickupLocation,
  );
  const pickupType =
    car.sandboxPresentation?.pickupLabel ?? pickupTypeLabels[car.pickupType];

  return (
    <div
      className="mx-auto w-full max-w-[900px]"
      data-car-details-desktop-location-overview
    >
      <div
        className="rounded-[16px] border border-slate-200 bg-white p-5 shadow-[0_3px_16px_rgba(15,23,42,0.035)]"
        data-car-details-desktop-location-card
      >
        <h2 className="car-details-desktop-section-heading-type">Car hire location</h2>
        <div className="mt-3 flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue">
            <MapPin size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="car-details-desktop-strong-copy-type">{pickupLocation}</p>
            <p className="car-details-desktop-secondary-copy-type mt-0.5">{pickupType}</p>
          </div>
        </div>
        {mapUrl ? (
          <div className="mt-4 overflow-hidden rounded-[12px] border border-slate-200">
            <iframe
              title={`${copy("carDetails.mapShowingPickup")} ${pickupLocation}`}
              src={mapUrl}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              className="block h-[250px] w-full border-0"
            />
            {directionsUrl ? (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring flex h-11 items-center justify-between border-t border-slate-200 px-4 text-[13px] font-bold text-[#075EE8] hover:bg-slate-50"
              >
                {copy("carDetails.getDirections")}
                <ExternalLink size={16} aria-hidden="true" />
              </a>
            ) : null}
          </div>
        ) : directionsUrl ? (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring mt-4 inline-flex min-h-10 items-center gap-2 text-[13px] font-bold text-[#075EE8]"
          >
            {copy("carDetails.getDirections")}
            <ExternalLink size={16} aria-hidden="true" />
          </a>
        ) : null}
      </div>
      <div
        className="mt-5 pb-1"
        data-car-details-desktop-location-details
      >
        <h3 className="car-details-desktop-item-heading-type">
          {copy("carDetails.pickupLocationDetails")}
        </h3>
        <ul className="car-details-desktop-primary-copy-type mt-3 list-disc space-y-2 ps-5 marker:text-[#075EE8]">
          {car.pickupInstructions ? <li>{car.pickupInstructions}</li> : null}
          <li>{copy("carDetails.confirmPickupDetails")}</li>
        </ul>
      </div>
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
          ? "flex shrink-0 items-center gap-2"
          : "flex h-11 shrink-0 items-center overflow-hidden rounded-full border border-white/70 bg-white/85 shadow-[0_2px_7px_rgba(15,23,42,0.08)] backdrop-blur-md"
      }
      data-car-details-actions
    >
      <button
        type="button"
        aria-label={`${isSaved ? copy("carDetails.unsave") : copy("carDetails.save")} ${car.modelName}`}
        aria-pressed={isSaved}
        data-car-details-utility-action="save"
        onClick={toggleSavedCar}
        className={`focus-ring flex items-center justify-center transition ${desktop ? "size-10 rounded-full border border-slate-300 bg-[#E7EBF1] shadow-[0_2px_8px_rgba(15,23,42,0.14)] hover:bg-[#DDE3EB]" : "size-11 bg-transparent hover:bg-white/70"} ${isSaved ? "text-rose-500" : desktop ? "text-[#07133B]" : "text-slate-700"}`}
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
        data-car-details-utility-action="share"
        onClick={() => void shareCar()}
        className={`focus-ring flex items-center justify-center transition ${desktop ? "size-10 rounded-full border border-slate-300 bg-[#E7EBF1] text-[#07133B] shadow-[0_2px_8px_rgba(15,23,42,0.14)] hover:bg-[#DDE3EB]" : "size-11 bg-transparent text-slate-700 hover:bg-white/70"}`}
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
  const { start: startRouteProgress } = useRouteProgress();
  const [mobileResultsPending, setMobileResultsPending] = useState(false);
  const copy = (key: string) => t[key] || enTranslations[key] || key;
  const sandboxHref =
    car.inventorySource === "kayak-sandbox"
      ? sandboxBookingUrl(getPrimaryCarOffer(car)?.bookingUrl)
      : null;
  const handleMobileResultsNavigation = (
    event: ReactMouseEvent<HTMLAnchorElement>,
  ) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    if (mobileResultsPending) {
      event.preventDefault();
      return;
    }

    setMobileResultsPending(true);
    startRouteProgress();
  };

  const primaryAction: CarDetailsPrimaryAction = sandboxHref
    ? {
        kind: "sandbox-handoff",
        label: copy("carDetails.continueDeal"),
        href: sandboxHref,
      }
    : {
        kind: "standalone-disabled-provider",
        label: copy("carDetails.continueDeal"),
      };
  return (
    <main className="flex-1 bg-[#F5F7FB] pb-[calc(7.5rem+env(safe-area-inset-bottom))] lg:bg-[#F8FAFC] lg:pb-0">
      <CarsRouteLoadingOverlay active={mobileResultsPending} />
      <section className="bg-transparent lg:pb-0" data-car-details-desktop-surface>
        <div className="page-shell py-0 lg:py-6 lg:max-w-[1080px]" data-car-details-body-shell>
          <div>
            <CarDetailsExperience
              car={car}
              search={search}
              presentation="standalone-content"
              primaryAction={primaryAction}
              mobileBackControl={
                <Link
                  href={resultsHref}
                  aria-label="Back to Cars results"
                  aria-disabled={mobileResultsPending}
                  onClick={handleMobileResultsNavigation}
                  className="focus-ring flex size-11 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/85 text-slate-900 shadow-[0_2px_7px_rgba(15,23,42,0.08)] backdrop-blur-md"
                  data-car-details-mobile-back
                >
                  <ArrowLeft size={25} strokeWidth={2.2} aria-hidden="true" />
                </Link>
              }
              desktopBackControl={
                <Link
                  href={resultsHref}
                  aria-label={copy("carDetails.backToResults")}
                  title={copy("carDetails.backToResults")}
                  className="focus-ring flex size-10 items-center justify-center rounded-full border border-slate-300 bg-[#E7EBF1] text-[#07133B] shadow-[0_2px_8px_rgba(15,23,42,0.14)] transition hover:bg-[#DDE3EB]"
                  data-car-details-desktop-back-link
                >
                  <ArrowLeft size={20} aria-hidden="true" />
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
  offers,
  selectedOfferId,
  onSelectOffer,
  days,
  price,
  copy,
  locale,
  headingLevel,
  showSectionHeading = true,
  showDesktopOfferList = false,
  actionForOffer,
}: {
  car: NormalizedCarResult;
  search: CarSearchParams;
  offers: CarOffer[];
  selectedOfferId?: string;
  onSelectOffer: (id: string) => void;
  days: number;
  price: PriceFn;
  copy: (key: string) => string;
  locale: string;
  headingLevel: HeadingLevel;
  showSectionHeading?: boolean;
  showDesktopOfferList?: boolean;
  actionForOffer: (offer: CarOffer) => CarDetailsPrimaryAction;
}) {
  const selectedOffer =
    offers.find((candidate) => candidate.id === selectedOfferId) ?? offers[0];
  const desktopOrderedOffers = selectedOffer
    ? [
        selectedOffer,
        ...offers.filter((offer) => offer.id !== selectedOffer.id),
      ]
    : offers;
  const factsForOffer = (offer: CarOffer) =>
    car.sandboxPresentation
      ? [
          { label: unavailableOfferLabel, Icon: ShieldCheck },
          { label: unavailableBookingMessage, Icon: Gauge },
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
  const providerFactsForOffer = (offer: CarOffer) => {
    const facts: Array<{ label: string; Icon: typeof ShieldCheck }> = [];
    if (offer.freeCancellation) {
      facts.push({
        label: copy("carDetails.freeCancellation"),
        Icon: ShieldCheck,
      });
    }
    if (offer.payAtPickup) {
      facts.push({
        label: copy("carsResults.payAtPickup"),
        Icon: CarFront,
      });
    }
    if (offer.taxesAndFeesIncluded) {
      facts.push({
        label: copy("carDetails.feesIncludedShort"),
        Icon: ShieldCheck,
      });
    }
    return facts.slice(0, 3);
  };
  return (
    <div
      className={`border-b border-slate-200 bg-[#F5F7FB] pb-7 pt-3 lg:mx-auto lg:w-full lg:bg-transparent lg:pb-[22px] lg:pt-2 ${showDesktopOfferList ? "lg:max-w-[900px]" : "lg:max-w-[820px]"}`}
      data-car-price-comparison
    >
      {showSectionHeading ? (
        <Heading
          level={headingLevel}
          className="car-details-desktop-section-heading-type hidden lg:block lg:text-[16px] lg:font-semibold lg:leading-6 lg:tracking-[-0.1px] lg:text-[#192024]"
        >
          Compare deals
        </Heading>
      ) : null}
      <p className={`car-details-desktop-primary-copy-type mt-1 text-[11px] font-medium leading-4 text-slate-600 lg:text-[14px] lg:font-normal lg:leading-[22px] lg:text-[#303B42] ${showSectionHeading ? "lg:mt-3" : "lg:mt-0"}`}>
        {formatCarDate(search.pickupDate, locale)} –{" "}
        {formatCarDate(search.dropoffDate, locale)} · {days}{" "}
        {days === 1 ? copy("carDetails.day") : copy("carDetails.days")}
      </p>

      <div
        className="mt-5 space-y-2.5 lg:hidden"
        role="radiogroup"
        aria-label="Car deal options"
        data-mobile-car-deal-list
      >
        {offers.map((offer) => {
          const selected = offer.id === selectedOffer?.id;
          const daily = price(offer.pricePerDay, offer.currency);
          const facts = factsForOffer(offer);
          const providerName =
            compactBookingProviderName(offer) ||
            providerValue(car.rentalCompanyName) ||
            copy("carsResults.bookingProvider");
          const sandboxSupplier = car.sandboxPresentation
            ? providerValue(offer.rentalCompanyName) ||
              providerValue(car.rentalCompanyName)
            : "";
          return (
            <button
              key={offer.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${daily.ariaLabel} ${copy("carsResults.perDay")}`}
              onClick={() => onSelectOffer(offer.id)}
              className={`block w-full rounded-[14px] border bg-white px-2 py-3 text-start transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075EE8]/35 lg:rounded-[14px] lg:px-4 lg:py-3 lg:shadow-[0_2px_10px_rgba(15,23,42,0.025)] ${selected ? "border-[#075EE8] ring-1 ring-[#075EE8]/10 lg:shadow-[0_6px_18px_rgba(7,94,232,0.08)]" : "border-slate-200 lg:hover:border-slate-300"}`}
            >
              <span className="flex min-w-0 items-center justify-between gap-3">
                <CarOfferProviderBrand
                  car={car}
                  offer={offer}
                  providerName={providerName}
                  compact
                />
                <span
                  className={`flex size-4 shrink-0 items-center justify-center rounded-full border-[1.5px] bg-white ${selected ? "border-[#075EE8]" : "border-slate-400"}`}
                  aria-hidden="true"
                >
                  {selected ? <span className="size-1.5 rounded-full bg-[#075EE8]" /> : null}
                </span>
              </span>
              <span className="mt-3 flex min-w-0 items-end gap-2.5 lg:mt-3 lg:gap-4">
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-[7px]">
                  {car.sandboxPresentation ? (
                    sandboxSupplier ? (
                      <span className="inline-flex min-w-0 shrink items-center gap-[3px] text-[10.5px] font-semibold leading-[15px] text-slate-700 lg:gap-1.5 lg:text-[14px] lg:font-normal lg:leading-[22px] lg:text-[#303B42]">
                        <CarFront
                          size={14}
                          strokeWidth={2}
                          className="shrink-0 text-slate-600"
                          aria-hidden="true"
                        />
                        <span className="max-w-[150px] truncate">
                          {sandboxSupplier}
                        </span>
                      </span>
                    ) : null
                  ) : (
                    facts.map(({ label, Icon }) => (
                      <span
                        key={label}
                        className="inline-flex shrink-0 items-center gap-[3px] whitespace-nowrap text-[10.5px] font-semibold leading-[15px] text-slate-700 lg:gap-1.5 lg:text-[14px] lg:font-normal lg:leading-[22px] lg:text-[#303B42]"
                      >
                        <Icon
                          size={14}
                          strokeWidth={2}
                          className="shrink-0 text-slate-600"
                          aria-hidden="true"
                        />
                        {label}
                      </span>
                    ))
                  )}
                </span>
                <span className="flex min-w-[72px] max-w-[42%] shrink flex-col items-end">
                  <strong
                    className="max-w-full whitespace-nowrap text-[19px] font-semibold leading-[22px] tracking-[-0.015em] text-[#071A48] tabular-nums lg:text-slate-950"
                    dir="ltr"
                    title={daily.title}
                    aria-label={daily.ariaLabel}
                  >
                    {daily.formatted}
                  </strong>
                  <span className="text-[10px] font-medium leading-[13px] text-[#075EE8]">
                    {copy("carsResults.perDay")}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {showDesktopOfferList && desktopOrderedOffers.length ? (
        <div
          className="mt-3 hidden w-full space-y-2 lg:block"
          data-desktop-car-deal-list
        >
          {desktopOrderedOffers.map((offer) => {
            const selected = offer.id === selectedOffer?.id;
            const total = price(offer.totalPrice, offer.currency);
            const providerName =
              compactBookingProviderName(offer) ||
              providerValue(car.rentalCompanyName) ||
              copy("carsResults.bookingProvider");
            const providerFacts = providerFactsForOffer(offer);
            const offerAction = actionForOffer(offer);
            const actionClassName =
              "focus-ring inline-flex min-h-10 min-w-[116px] shrink-0 items-center justify-center rounded-lg bg-[#075EE8] px-4 text-[13px] font-bold leading-5 text-white shadow-[0_2px_8px_rgba(7,94,232,0.16)] transition hover:bg-[#004BB8]";
            return (
              <div
                key={offer.id}
                className={`grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-5 rounded-[14px] border bg-white px-4 py-3 transition ${selected ? "border-[#075EE8] shadow-[0_5px_16px_rgba(7,94,232,0.07)] ring-1 ring-[#075EE8]/10" : "border-slate-200 hover:border-slate-300"}`}
                data-car-details-desktop-deal-row
                data-selected={selected ? "true" : "false"}
              >
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelectOffer(offer.id)}
                  className="focus-ring min-w-0 text-start"
                  data-car-details-desktop-deal-summary
                >
                  <span data-car-details-desktop-deal-provider>
                    <CarOfferProviderBrand
                      car={car}
                      offer={offer}
                      providerName={providerName}
                    />
                  </span>
                  <strong
                    className="mt-0.5 block whitespace-nowrap text-[20px] font-bold leading-6 tracking-[-0.015em] text-[#07133B] tabular-nums"
                    dir="ltr"
                    title={total.title}
                    aria-label={total.ariaLabel}
                    data-car-details-desktop-deal-total
                  >
                    {total.formatted}
                  </strong>
                  {providerFacts.length ? (
                    <span
                      className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5"
                      data-car-details-desktop-deal-benefits
                    >
                      {providerFacts.map(({ label, Icon }) => (
                        <span
                          key={label}
                          className="car-details-desktop-benefit-type inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap text-[12px] font-medium leading-4 text-[#526174]"
                        >
                          <Icon
                            size={13}
                            strokeWidth={2}
                            className="shrink-0 text-[#59636A]"
                            aria-hidden="true"
                          />
                          {label}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </button>
                <div className="flex shrink-0 items-center justify-end">
                  {offerAction.kind === "sandbox-handoff" ? (
                    <a
                      href={offerAction.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      referrerPolicy="no-referrer"
                      onClick={() => onSelectOffer(offer.id)}
                      className={actionClassName}
                      data-car-details-desktop-deal-cta
                    >
                      {copy("carDetails.continueDeal")}
                    </a>
                  ) : offerAction.kind === "standalone-disabled-provider" ? (
                    <button
                      type="button"
                      disabled
                      className={`${actionClassName} disabled:cursor-not-allowed disabled:opacity-100`}
                      data-car-details-desktop-deal-cta
                    >
                      {copy("carDetails.continueDeal")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!offerAction.enabled || offerAction.pending}
                      aria-label={offerAction.accessibleLabel}
                      onClick={() => {
                        onSelectOffer(offer.id);
                        offerAction.onActivate();
                      }}
                      className={`${actionClassName} disabled:cursor-not-allowed disabled:opacity-60`}
                      data-car-details-desktop-deal-cta
                    >
                      {offerAction.pending
                        ? copy("deals.guided.carDetails.saving")
                        : copy("carDetails.continueDeal")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {selectedOffer ? (
        <div className={`mt-5 hidden rounded-[14px] border border-[#075EE8] bg-white px-4 py-4 ring-1 ring-[#075EE8]/10 ${showDesktopOfferList ? "lg:hidden" : "lg:block"}`}>
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-6">
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
            <div className="col-span-2 mt-5 flex min-w-0 items-end gap-x-4 overflow-visible">
              <div className="flex min-w-0 flex-1 flex-nowrap items-end gap-x-4 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {factsForOffer(selectedOffer).map(({ label, Icon }) => (
                  <span
                    key={label}
                    className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-slate-700"
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
                  title={price(selectedOffer.pricePerDay, selectedOffer.currency).title}
                  aria-label={price(selectedOffer.pricePerDay, selectedOffer.currency).ariaLabel}
                >
                  {price(selectedOffer.pricePerDay, selectedOffer.currency).formatted}
                </strong>
                <span className="inline-flex min-h-4 items-center overflow-visible text-xs font-medium leading-4 text-[#075EE8]">
                  {copy("carsResults.perDay")}
                </span>
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CarLocationSection({
  car,
  search,
  locale,
  copy,
  headingLevel,
  showSectionHeading = true,
}: {
  car: NormalizedCarResult;
  search: CarSearchParams;
  locale: string;
  copy: (key: string) => string;
  headingLevel: HeadingLevel;
  showSectionHeading?: boolean;
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
      className="border-b border-slate-200 bg-[#F5F7FB] pb-7 pt-3 lg:mx-auto lg:w-full lg:max-w-[820px] lg:bg-transparent lg:pb-[22px] lg:pt-5"
      data-car-location-section
    >
      {showSectionHeading ? (
        <Heading
          level={headingLevel}
          className="car-details-desktop-section-heading-type hidden lg:block lg:text-[16px] lg:font-semibold lg:leading-6 lg:tracking-[-0.1px] lg:text-[#192024]"
        >
          {copy("carDetails.location")}
        </Heading>
      ) : null}
      <div className={`mt-0 flex items-start gap-3 ${showSectionHeading ? "lg:mt-3" : "lg:mt-0"}`}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue">
          <MapPin size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="car-details-desktop-strong-copy-type text-[13px] font-semibold leading-5 text-slate-800 lg:text-[14px] lg:font-semibold lg:leading-[22px] lg:text-[#192024]">
            {pickupLocation}
          </p>
          <p className="car-details-desktop-secondary-copy-type text-xs leading-5 text-slate-500 lg:text-[14px] lg:leading-[22px] lg:text-[#59636A]">
            {car.sandboxPresentation?.pickupLabel ??
              pickupTypeLabels[car.pickupType]}
          </p>
        </div>
      </div>
      {mapUrl ? (
        <div
          className="mt-4 flex flex-col overflow-hidden rounded-[14px] border border-slate-200 bg-white lg:rounded-2xl lg:shadow-[0_4px_18px_rgba(15,23,42,0.04)]"
          data-car-location-map-card
        >
          <iframe
            title={`${copy("carDetails.mapShowingPickup")} ${pickupLocation}`}
            src={mapUrl}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            className="block h-[216px] w-full shrink-0 border-0 sm:h-[220px] lg:h-[320px]"
          />
          {directionsUrl ? (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring flex h-11 shrink-0 items-center justify-between border-t border-slate-200 px-4 text-sm font-bold leading-5 text-[#075EE8] hover:bg-slate-50 lg:text-blue"
            >
              {copy("carDetails.getDirections")}
              <ExternalLink size={16} className="shrink-0" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      ) : null}
      <div className="mt-4 overflow-hidden rounded-[14px] border border-slate-200 bg-white lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent">
        <div className="p-4 lg:p-0" data-car-location-timeline>
          {[
            [
              "Pick-up",
              copy("carDetails.pickup"),
              pickupLocation,
              search.pickupDate,
              search.pickupTime,
            ],
            [
              "Return",
              copy("carDetails.return"),
              returnLocation,
              search.dropoffDate,
              search.dropoffTime,
            ],
          ].map(([mobileLabel, label, location, date, time], index) => (
            <div
              key={label}
              className={`relative border-s-2 border-blue-200 ps-5 ${index === 0 ? "pb-6" : ""}`}
            >
              <span className="absolute -start-[7px] top-1 size-3 rounded-full bg-[#004BB8]" />
              <p className="car-details-desktop-item-heading-type text-[15px] font-bold leading-[22px] text-[#071A48] lg:text-[14px] lg:font-semibold lg:leading-[22px] lg:tracking-normal lg:text-[#192024]">
                <span className="lg:hidden">{mobileLabel}</span>
                <span className="hidden lg:inline">{label}</span>
              </p>
              <p className="car-details-desktop-primary-copy-type mt-1 flex gap-2 text-[14px] font-medium leading-5 text-[#071A48] lg:text-[14px] lg:font-normal lg:leading-[22px] lg:text-[#303B42]">
                <MapPin
                  size={16}
                  className="shrink-0 text-[#004BB8]"
                  aria-hidden="true"
                />
                {location}
              </p>
              <p className="car-details-desktop-secondary-copy-type mt-1 flex gap-2 text-[13px] font-normal leading-5 text-[#56658E] lg:text-[14px] lg:leading-[22px] lg:text-[#59636A]">
                <Clock3 size={16} className="shrink-0" aria-hidden="true" />
                <time dateTime={`${date}T${time}`}>
                  {formatCarDate(date, locale)}
                  {time ? ` · ${time}` : ""}
                </time>
              </p>
            </div>
          ))}
        </div>
        {!mapUrl && directionsUrl ? (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring flex min-h-11 items-center justify-between border-t border-slate-200 px-4 text-sm font-bold text-[#075EE8] hover:bg-slate-50 lg:border-0 lg:px-0 lg:text-blue"
          >
            {copy("carDetails.getDirections")}
            <ExternalLink size={16} aria-hidden="true" />
          </a>
        ) : null}
      </div>
      <div className="mt-7">
        <h3 className="car-details-desktop-item-heading-type text-[14px] font-bold leading-5 text-[#071A48] lg:text-[16px] lg:font-semibold lg:leading-[24px] lg:text-[#192024]">
          {copy("carDetails.pickupLocationDetails")}
        </h3>
        <ul className="car-details-desktop-primary-copy-type mt-3 list-disc space-y-2 ps-5 text-[14px] font-normal leading-5 text-[#334155] marker:text-[#075EE8] lg:list-none lg:ps-0 lg:text-[14px] lg:leading-[22px] lg:text-[#303B42]">
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
  showRentalBreakdown = true,
}: {
  offer: CarOffer;
  days: number;
  price: PriceFn;
  copy: (k: string) => string;
  action: CarDetailsPrimaryAction;
  showRentalBreakdown?: boolean;
}) {
  const total = price(offer.totalPrice, offer.currency);
  const daily = showRentalBreakdown
    ? price(offer.pricePerDay, offer.currency)
    : null;
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
      {showRentalBreakdown && daily ? (
        <>
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
        </>
      ) : null}
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
  showSectionHeading = true,
}: {
  car: NormalizedCarResult;
  search: CarSearchParams;
  locale: string;
  copy: (key: string) => string;
  sectionHeadingLevel: HeadingLevel;
  itemHeadingLevel: HeadingLevel;
  showSectionHeading?: boolean;
}) {
  const hasDriverLicenseRequirement = car.requiredDocuments.some((document) =>
    /driv(?:ing|er'?s?)\s+licen[cs]e/i.test(document),
  );
  return (
    <section
      className="-mx-4 border-y border-slate-200 bg-[#F5F7FB] px-4 py-5 lg:mx-auto lg:w-full lg:max-w-[820px] lg:rounded-none lg:border-x-0 lg:border-t-0 lg:border-b lg:border-slate-200 lg:bg-transparent lg:px-0 lg:pb-[22px] lg:pt-5 lg:shadow-none"
      data-car-pickup-return-section
    >
      {showSectionHeading ? (
        <Heading
          level={sectionHeadingLevel}
          className="car-details-desktop-section-heading-type hidden lg:block lg:text-[16px] lg:font-semibold lg:leading-6 lg:tracking-[-0.1px] lg:text-[#192024]"
        >
          {copy("carDetails.pickupReturn")}
        </Heading>
      ) : null}
      <div
        className={`relative mt-0 grid gap-5 md:grid-cols-2 md:gap-6 ${showSectionHeading ? "lg:mt-4" : "lg:mt-0"}`}
      >
        {[
          [
            "Pick-up",
            copy("carDetails.pickup"),
            car.pickupLocation,
            search.pickupDate,
            search.pickupTime,
          ],
          [
            "Return",
            copy("carDetails.return"),
            car.returnLocation,
            search.dropoffDate,
            search.dropoffTime,
          ],
        ].map(([mobileLabel, label, location, date, time]) => (
          <div key={label} className="relative border-s-2 border-blue-200 ps-5">
            <span className="absolute -start-[7px] top-1 size-3 rounded-full bg-[#004BB8]" />
            <Heading level={itemHeadingLevel} className="car-details-desktop-item-heading-type text-[15px] font-bold leading-[22px] text-[#071A48] lg:text-[16px] lg:font-semibold lg:leading-[24px] lg:text-[#192024]">
              <span className="lg:hidden">{mobileLabel}</span>
              <span className="hidden lg:inline">{label}</span>
            </Heading>
            <p className="car-details-desktop-primary-copy-type mt-1 flex gap-2 text-[14px] font-medium leading-5 text-[#071A48] lg:text-[14px] lg:font-normal lg:leading-[22px] lg:text-[#303B42]">
              <MapPin size={16} className="shrink-0 text-[#004BB8]" />
              {location || copy("carDetails.locationUnavailable")}
            </p>
            <p className="car-details-desktop-secondary-copy-type mt-1 flex gap-2 text-[13px] font-normal leading-5 text-[#56658E] lg:text-[14px] lg:leading-[22px] lg:text-[#59636A]">
              <Clock3 size={16} />
              <time dateTime={`${date}T${time}`}>
                {formatCarDate(date, locale)}
                {time ? ` · ${time}` : ""}
              </time>
            </p>
          </div>
        ))}
      </div>
      <p className="car-details-desktop-primary-copy-type mt-4 hidden text-sm font-medium leading-5 lg:block lg:text-[14px] lg:font-normal lg:leading-[22px] lg:text-[#303B42]">
        {car.sandboxPresentation?.pickupLabel ??
          pickupTypeLabels[car.pickupType]}
        {car.shuttleRequired ? ` · ${copy("carDetails.shuttleRequired")}` : ""}
      </p>
      {car.pickupInstructions && (
        <p className="car-details-desktop-primary-copy-type mt-2 hidden text-sm font-normal leading-5 lg:block lg:text-[14px] lg:leading-[22px] lg:text-[#303B42]">
          <strong>{copy("carDetails.pickupInstructions")}:</strong>{" "}
          {car.pickupInstructions}
        </p>
      )}
      {hasDriverLicenseRequirement ? (
        <div className="mt-5">
          <Heading
            level={itemHeadingLevel}
            className="car-details-desktop-item-heading-type text-[14px] font-bold leading-5 text-[#071A48] lg:text-[16px] lg:font-semibold lg:leading-[24px] lg:text-[#192024]"
          >
            Pickup requirements
          </Heading>
          <p className="car-details-desktop-primary-copy-type mt-2.5 flex items-start gap-2.5 text-[14px] font-medium leading-5 text-[#071A48] lg:text-[14px] lg:font-normal lg:leading-[22px] lg:text-[#303B42]">
            <IdCard
              size={19}
              className="mt-px shrink-0 text-slate-600"
              aria-hidden="true"
            />
            Valid driver&apos;s license
          </p>
        </div>
      ) : null}
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
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-[19px] font-semibold leading-[22px] tracking-[-0.25px] text-[#071A48] tabular-nums"
            dir="ltr"
            title={total.title}
            aria-label={total.ariaLabel}
          >
            {total.formatted}
          </p>
          <h2
            id="mobile-car-rental-total-heading"
            className="truncate text-[11px] font-semibold leading-4 text-[#56658E]"
          >
            Estimated rental total
          </h2>
        </div>
        {action.kind === "sandbox-handoff" ? (
          <div
            className="min-w-[140px] max-w-[180px] flex-[0.78]"
            data-mobile-car-dock-action
          >
            <a
              href={action.href}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
              className="focus-ring flex min-h-12 w-full items-center justify-center rounded-lg bg-blue px-3 text-xs font-bold leading-4 text-white"
            >
              {copy("carDetails.continueDeal")}
            </a>
          </div>
        ) : action.kind === "standalone-disabled-provider" ? (
          <div
            className="min-w-[140px] max-w-[180px] flex-[0.78]"
            data-mobile-car-dock-action
          >
            <button
              disabled
              className="focus-ring min-h-12 w-full rounded-lg bg-blue px-3 text-xs font-bold leading-4 text-white disabled:cursor-not-allowed disabled:opacity-100"
            >
              {action.label}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
