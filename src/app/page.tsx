"use client";

import Image from "next/image";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Compass,
  Heart,
  Hotel,
  Plane,
  Sparkles,
  Mail,
  SearchCheck,
  BadgeDollarSign,
  ShieldCheck,
} from "lucide-react";

import { FaqAccordion } from "@/components/faq/FaqAccordion";
import { AppHeader } from "@/components/layout/AppHeader";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { Footer } from "@/components/layout/Footer";
import { SearchTabs } from "@/components/search/SearchTabs";
import { LinkButton } from "@/components/ui/Button";
import {
  HOME_DISCOVERY_VISIBLE_CARD_COUNT,
  getHomeDiscoveryByRegion,
} from "@/data/homeDiscovery";
import { getPopularDestinationsByRegion } from "@/data/marketHomeContent";
import { buildDiscoveryLink } from "@/lib/home/buildDiscoveryLinks";
import { generalFaqs, homepageMobileFaqLimit } from "@/content/faqs";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import { getTranslations } from "@/lib/i18n";
import { translations as enTranslations } from "@/lib/i18n/en";
import {
  readSavedTripIds,
  toggleSavedTripId,
  writeSavedTripIds,
} from "@/lib/saved-trips-local";

const heroImage =
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1800&q=85";

type DestinationPriceSearch = {
  tripType: "one-way";
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  travelers: 1;
  adults: 1;
  children: 0;
  infants: 0;
  cabinClass: "economy";
  currency: string;
};

type DestinationPrice = {
  id: string;
  code: string;
  origin: string;
  price?: number;
  currency?: string;
  providerBacked: boolean;
  searchedAt?: string;
  expiresAt?: string;
  search?: DestinationPriceSearch;
  unavailable?: boolean;
};

type HomeDiscoveryCardItem = {
  id: string;
  title: string;
  originCity: string;
  originCode: string;
  destinationCity: string;
  destinationCode: string;
  routeNote: string;
  image: string;
  imageAlt: string;
};

type HomepageFare = Omit<DestinationPrice, "id" | "code" | "unavailable">;

type HomeDiscoveryFareCard = {
  item: HomeDiscoveryCardItem;
  fare?: HomepageFare;
  priceState: "fresh" | "none";
};

type DestinationPriceState = {
  loading: boolean;
  prices: Record<string, DestinationPrice>;
};

type DiscoveryFareCardState = {
  loading: boolean;
  cards: HomeDiscoveryFareCard[];
};

type NewsletterStatus = "idle" | "success" | "error";

function isNewsletterEmail(value: string) {
  const email = value.trim();
  return (
    email.length > 2 &&
    email.length <= 254 &&
    !/\s/.test(email) &&
    /^[^@]+@[^@]+\.[^@]+$/.test(email)
  );
}

export default function Home() {
  const { locale } = useLocale();
  const { mode: regionCode, selectedOption } = useRegion();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterMessage, setNewsletterMessage] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<NewsletterStatus>("idle");
  const [newsletterPending, setNewsletterPending] = useState(false);
  const [savedTripIds, setSavedTripIds] = useState<string[]>([]);
  const [destinationPriceState, setDestinationPriceState] =
    useState<DestinationPriceState>({
      loading: true,
      prices: {},
    });
  const [discoveryFareCardState, setDiscoveryFareCardState] =
    useState<DiscoveryFareCardState>({
      loading: true,
      cards: [],
    });
  const destinationsRailRef = useRef<HTMLDivElement>(null);

  const scrollDestinationsRail = (direction: "left" | "right") => {
    const rail = destinationsRailRef.current;

    if (!rail) return;

    const amount = Math.round(rail.clientWidth * 0.85);

    rail.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  const dictionary = useMemo(() => getTranslations(locale), [locale]);
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const popularDestinationResolution = useMemo(
    () => getPopularDestinationsByRegion(regionCode),
    [regionCode],
  );
  const {
    effectiveMarketCode: popularDestinationMarket,
    fallbackLevel: popularDestinationFallbackLevel,
    fallbackUsed: popularDestinationFallbackUsed,
    items: popularDestinations,
  } = popularDestinationResolution;
  const fallbackDiscoveryCards = useMemo<HomeDiscoveryFareCard[]>(
    () =>
      getHomeDiscoveryByRegion(regionCode)
        .slice(0, HOME_DISCOVERY_VISIBLE_CARD_COUNT)
        .map((item) => ({
          item: {
            id: item.id,
            title: item.title,
            originCity: item.originCity,
            originCode: item.originCode,
            destinationCity: item.destinationCity,
            destinationCode: item.destinationCode,
            routeNote: item.routeNote,
            image: item.image,
            imageAlt: item.imageAlt,
          },
          priceState: "none",
        })),
    [regionCode],
  );
  const discoveryCards = discoveryFareCardState.cards.length
    ? discoveryFareCardState.cards
    : fallbackDiscoveryCards;
  const mobileDiscoveryGroups = useMemo(() => {
    const groups = [];

    for (let index = 0; index < discoveryCards.length; index += 6) {
      groups.push(discoveryCards.slice(index, index + 6));
    }

    return groups;
  }, [discoveryCards]);

  const handleNewsletterSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (newsletterPending) return;

    const email = newsletterEmail.trim();
    if (!isNewsletterEmail(email)) {
      setNewsletterStatus("error");
      setNewsletterMessage("Enter a valid email address.");
      return;
    }

    setNewsletterPending(true);
    setNewsletterStatus("idle");
    setNewsletterMessage("");

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source: "homepage",
          locale,
          regionCode,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || "Unable to subscribe right now.");
      }

      setNewsletterStatus("success");
      setNewsletterMessage(data.message || t("homeNewsletterThanks"));
      setNewsletterEmail("");
    } catch (error) {
      setNewsletterStatus("error");
      setNewsletterMessage(
        error instanceof Error
          ? error.message
          : "We couldn’t subscribe you right now. Please try again soon.",
      );
    } finally {
      setNewsletterPending(false);
    }
  };

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setSavedTripIds(readSavedTripIds());
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchDestinationPrices() {
      setDestinationPriceState({ loading: true, prices: {} });
      try {
        const response = await fetch("/api/flights/destination-prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            regionCode,
            effectiveMarketCode: popularDestinationMarket,
            fallbackLevel: popularDestinationFallbackLevel,
            fallbackUsed: popularDestinationFallbackUsed,
            destinations: popularDestinations.map(({ id, code, originCode }) => ({
              id,
              code,
              originCode,
            })),
            currency: "USD",
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Destination prices unavailable");
        }

        const payload = (await response.json()) as {
          prices?: DestinationPrice[];
        };
        const prices = Object.fromEntries(
          (payload.prices ?? []).map((price) => [price.id, price]),
        );

        setDestinationPriceState({ loading: false, prices });
      } catch {
        if (controller.signal.aborted) return;
        setDestinationPriceState({ loading: false, prices: {} });
      }
    }

    void fetchDestinationPrices();

    return () => controller.abort();
  }, [
    popularDestinationFallbackLevel,
    popularDestinationFallbackUsed,
    popularDestinationMarket,
    popularDestinations,
    regionCode,
  ]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchDiscoveryFareCards() {
      setDiscoveryFareCardState({ loading: true, cards: [] });

      try {
        const response = await fetch("/api/flights/home-discovery-fares", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            regionCode,
            limit: HOME_DISCOVERY_VISIBLE_CARD_COUNT,
            currency: "USD",
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Discovery fare cards unavailable");
        }

        const payload = (await response.json()) as {
          cards?: HomeDiscoveryFareCard[];
        };

        setDiscoveryFareCardState({
          loading: false,
          cards: Array.isArray(payload.cards) ? payload.cards : [],
        });
      } catch {
        if (controller.signal.aborted) return;
        setDiscoveryFareCardState({ loading: false, cards: [] });
      }
    }

    void fetchDiscoveryFareCards();

    return () => controller.abort();
  }, [regionCode]);

  const handleSavedTripToggle = (
    event: React.MouseEvent<HTMLButtonElement>,
    itemId: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setSavedTripIds((current) => {
      const next = toggleSavedTripId(current, itemId);
      writeSavedTripIds(next);
      return next;
    });
  };

  return (
    <>
      <AppHeader hideMobileSecondaryNavLinks />

      <main className="flex-1 bg-white">
        <section className="relative overflow-visible bg-[#f8f7ff]">
          <div className="absolute inset-0">
            <Image
              src={heroImage}
              alt={t("homeHeroImageAlt")}
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />

            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.97)_4%,rgba(255,255,255,0.93)_37%,rgba(255,255,255,0.62)_58%,rgba(255,255,255,0.12)_100%)]" />

            <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#f8f7ff] via-[#f8f7ff]/75 to-transparent" />
          </div>

          <div className="page-shell relative pb-5 pt-8 sm:pb-6 sm:pt-10 lg:pt-12">
            <div className="grid content-start gap-3 pb-3 sm:gap-4 sm:pb-4 lg:max-w-[1200px]">
              <div className="space-y-2.5 pt-1">
                <h1 className="max-w-3xl text-[2rem] font-semibold leading-[1.08] tracking-[-0.025em] text-slate-900 sm:text-[2.4rem] lg:text-[3rem]">
                  {t("homeHeroTitle")}
                </h1>

                <p className="max-w-xl text-base font-semibold leading-7 text-slate-700 sm:text-lg sm:leading-8">
                  {t("homeHeroSubtitle")}
                </p>
              </div>

              <div className="relative z-10 mt-0.5 w-full max-w-[1280px]">
                <SearchTabs
                  t={t as unknown as Record<string, string>}
                  compactHero
                />
              </div>
            </div>
          </div>
        </section>

        <section className="page-shell py-5">
          <div className="flex items-center">
            <h2 className="text-2xl font-bold tracking-normal text-slate-900">
              {t("homePopularDestinations")}
            </h2>
          </div>

          <div className="relative mt-6">
            <button
              type="button"
              aria-label="Previous destinations"
              onClick={() => scrollDestinationsRail("left")}
              className="focus-ring absolute -left-2 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-slate-600 shadow-[0_16px_30px_-20px_rgba(15,23,42,0.65)] transition hover:bg-white hover:text-slate-900 sm:flex"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              aria-label={t("homeNextDestinations")}
              onClick={() => scrollDestinationsRail("right")}
              className="focus-ring absolute -right-2 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-slate-600 shadow-[0_16px_30px_-20px_rgba(15,23,42,0.65)] transition hover:bg-white hover:text-slate-900 sm:flex"
            >
              <ChevronRight size={18} />
            </button>

            <div
              ref={destinationsRailRef}
              className="-mx-2 flex snap-x snap-mandatory gap-5 overflow-x-auto px-2 pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {popularDestinations.map((destination) => {
                const price = destinationPriceState.prices[destination.id];

                return (
                  <DestinationCard
                    key={destination.id}
                    city={destination.city}
                    country={destination.country}
                    imageAlt={destination.imageAlt}
                    saveLabelTemplate={t("homeSaveDestination")}
                    image={destination.image}
                    destinationId={destination.id}
                    price={price}
                    displayCurrency={selectedOption.currency}
                    originCode={destination.originCode}
                    destinationCode={destination.code}
                    href={buildDestinationCardHref(price, destination.city, {
                      originCode: destination.originCode,
                      destinationCode: destination.code,
                    })}
                    isPriceLoading={destinationPriceState.loading}
                    isSaved={savedTripIds.includes(destination.id)}
                    onHeartToggle={handleSavedTripToggle}
                  />
                );
              })}
            </div>
          </div>
        </section>

        <section className="page-shell bg-transparent py-5 sm:py-6">
          <div className="space-y-4 sm:space-y-5">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.75rem]">
                Discover your next adventure here
              </h2>
              <p className="text-sm font-normal leading-6 text-slate-600 sm:text-base">
                Compare smart route ideas, flexible fares, and destinations
                picked for your region.
              </p>
            </div>
            <div className="flex items-center justify-end sm:hidden">
              <div className="pointer-events-none mb-2 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                Swipe for more
                <ChevronRight size={13} className="text-slate-500" />
              </div>
            </div>
            <div className="-mx-1.5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1.5 pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:hidden">
              {mobileDiscoveryGroups.map((group, groupIndex) => (
                <div
                  key={`group-${groupIndex}`}
                  className="grid min-w-full snap-start grid-cols-2 gap-2.5"
                >
                  {group.map((card) => {
                    return (
                      <DiscoverySuggestionCard
                        key={card.item.id}
                        href={buildDiscoveryCardHref(
                          card.fare,
                          buildDiscoveryLink(card.item),
                          {
                            originCode: card.item.originCode,
                            destinationCode: card.item.destinationCode,
                          },
                        )}
                        itemId={card.item.id}
                        image={card.item.image}
                        imageAlt={card.item.imageAlt}
                        destinationCode={card.item.destinationCode}
                        title={card.item.title}
                        originCode={card.item.originCode}
                        destinationCodeLabel={card.item.destinationCode}
                        routeNote={card.item.routeNote}
                        compact
                        price={card.fare}
                        displayCurrency={selectedOption.currency}
                        expectedOriginCode={card.item.originCode}
                        expectedDestinationCode={card.item.destinationCode}
                        isPriceLoading={discoveryFareCardState.loading}
                        isSaved={savedTripIds.includes(card.item.id)}
                        onHeartToggle={handleSavedTripToggle}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="hidden grid-cols-3 gap-3 sm:grid md:grid-cols-4 lg:grid-cols-4">
              {discoveryCards.map((card) => {
                return (
                  <DiscoverySuggestionCard
                    key={card.item.id}
                    href={buildDiscoveryCardHref(
                      card.fare,
                      buildDiscoveryLink(card.item),
                      {
                        originCode: card.item.originCode,
                        destinationCode: card.item.destinationCode,
                      },
                    )}
                    itemId={card.item.id}
                    image={card.item.image}
                    imageAlt={card.item.imageAlt}
                    destinationCode={card.item.destinationCode}
                    title={card.item.title}
                    originCode={card.item.originCode}
                    destinationCodeLabel={card.item.destinationCode}
                    routeNote={card.item.routeNote}
                    price={card.fare}
                    displayCurrency={selectedOption.currency}
                    expectedOriginCode={card.item.originCode}
                    expectedDestinationCode={card.item.destinationCode}
                    isPriceLoading={discoveryFareCardState.loading}
                    isSaved={savedTripIds.includes(card.item.id)}
                    onHeartToggle={handleSavedTripToggle}
                  />
                );
              })}
            </div>
          </div>
        </section>

        <section className="page-shell bg-transparent py-4 sm:py-5">
          <div className="space-y-3">
            <div className="max-w-3xl space-y-1.5">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-3xl">
                {t("homeTrustTitle")}
              </h2>
              <p className="text-sm font-medium leading-6 text-slate-700 sm:text-base">
                {t("homeTrustSubtitle")}
              </p>
            </div>

            <div className="mt-4 divide-y divide-slate-200/70 md:grid md:grid-cols-3 md:gap-6 md:divide-y-0 md:[&>article+article]:border-l md:[&>article+article]:border-slate-200/70 md:[&>article+article]:pl-6">
              <article className="flex items-start gap-3.5 py-3.5 first:pt-1 last:pb-1 md:px-2 md:py-2">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                  <SearchCheck size={20} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-base font-bold leading-6 text-slate-900">
                    {t("homeTrustCompareTitle")}
                  </h3>
                  <p className="mt-1 text-sm font-medium leading-6 text-slate-700">
                    {t("homeTrustCompareBody")}
                  </p>
                </div>
              </article>

              <article className="flex items-start gap-3.5 py-3.5 first:pt-1 last:pb-1 md:px-2 md:py-2">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                  <BadgeDollarSign size={20} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-base font-bold leading-6 text-slate-900">
                    {t("homeTrustPricingTitle")}
                  </h3>
                  <p className="mt-1 text-sm font-medium leading-6 text-slate-700">
                    {t("homeTrustPricingBody")}
                  </p>
                </div>
              </article>

              <article className="flex items-start gap-3.5 py-3.5 first:pt-1 last:pb-1 md:px-2 md:py-2">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                  <ShieldCheck size={20} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-base font-bold leading-6 text-slate-900">
                    {t("homeTrustHandoffTitle")}
                  </h3>
                  <p className="mt-1 text-sm font-medium leading-6 text-slate-700">
                    {t("homeTrustHandoffBody")}
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="page-shell grid gap-5 py-9 lg:grid-cols-2">
          <PromoPanel
            tone="violet"
            title={t("homePromoFlightsTitle")}
            body={t("homePromoFlightsBody")}
            cta={t("homePromoFlightsCta")}
            href="/deals"
            icon={<Plane size={74} />}
          />

          <PromoPanel
            tone="amber"
            title={t("homePromoHotelsTitle")}
            body={t("homePromoHotelsBody")}
            cta={t("homePromoHotelsCta")}
            href="/hotels/results"
            icon={<Hotel size={74} />}
          />
        </section>

        <section className="page-shell pb-12 pt-2 sm:pt-3">
          <div className="max-w-3xl space-y-2">
            <h2 className="text-2xl font-semibold tracking-normal text-slate-800 sm:font-bold sm:text-slate-900">
              Frequently asked questions
            </h2>
            <p className="text-sm font-medium leading-6 text-slate-700 sm:text-base">
              Learn how Kurioticket helps you compare flights, hotels, and
              travel options before booking with trusted providers.
            </p>
          </div>

          <FaqAccordion
            items={generalFaqs}
            mobileLimit={homepageMobileFaqLimit}
            className="mt-5"
          />

          <Link
            href="/faq"
            className="mt-4 inline-flex text-sm font-bold text-indigo-700 underline-offset-4 hover:text-indigo-900 hover:underline sm:hidden"
          >
            View all FAQs
          </Link>
        </section>

        <section className="page-shell pb-6 sm:pb-8">
          <div className="w-full max-w-[820px]">
            <div className="rounded-lg border border-slate-200/80 bg-violet-50/70 p-3 sm:p-3.5">
              <div className="flex flex-row items-center gap-1.5 sm:gap-2.5 lg:gap-3.5">
                <div className="flex shrink-0 items-center gap-1.5 sm:min-w-0 sm:basis-[34%] sm:gap-2.5 lg:basis-[34%] lg:max-w-[31ch]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 sm:h-10 sm:w-10">
                    <Mail className="size-5 sm:size-[22px]" />
                  </span>

                  <div className="hidden min-w-0 max-w-[17ch] space-y-0 sm:block lg:max-w-[24ch]">
                    <h2 className="truncate text-xs font-black leading-tight text-slate-950 sm:text-sm">
                      {t("homeNewsletterTitle")}
                    </h2>

                    <p className="hidden truncate text-xs font-semibold leading-5 text-slate-700 min-[420px]:block sm:text-sm">
                      {t("homeNewsletterBody")}
                    </p>
                  </div>
                </div>

                <form
                  className="flex min-w-0 flex-1 flex-row items-center gap-1.5 sm:basis-auto sm:gap-2 lg:basis-[66%] lg:flex-nowrap lg:justify-end"
                  onSubmit={handleNewsletterSubmit}
                  aria-busy={newsletterPending}
                >
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(event) => {
                      setNewsletterEmail(event.target.value);
                      if (newsletterStatus !== "idle") {
                        setNewsletterStatus("idle");
                        setNewsletterMessage("");
                      }
                    }}
                    placeholder={t("homeNewsletterPlaceholder")}
                    className="focus-ring h-9 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-950 shadow-sm placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 sm:h-11 sm:min-w-[12rem] sm:px-3.5 sm:text-sm lg:min-w-[20rem] lg:max-w-[30rem]"
                    aria-label={t("homeEmailAddress")}
                    disabled={newsletterPending}
                    required
                  />

                  <button
                    type="submit"
                    className="focus-ring h-9 w-auto shrink-0 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 text-xs font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500 sm:h-11 sm:px-5 sm:text-sm"
                    aria-busy={newsletterPending}
                    disabled={newsletterPending}
                  >
                    {newsletterPending ? "Subscribing…" : t("homeSubscribe")}
                  </button>
                </form>
              </div>

              <p className="mt-2 text-[11px] font-semibold leading-4 text-slate-600 sm:text-xs">
                By subscribing, you agree to receive Kurioticket updates. You can unsubscribe anytime.
              </p>

              {newsletterMessage ? (
                <p
                  className={`mt-2 text-xs font-semibold sm:text-sm ${
                    newsletterStatus === "error" ? "text-red-700" : "text-slate-700"
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  {newsletterMessage}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

function DiscoveryCardImage({
  image,
  imageAlt,
  destinationCode,
}: {
  image: string;
  imageAlt: string;
  destinationCode: string;
}) {
  const [hasError, setHasError] = useState(false);
  const hasImage = Boolean(image?.trim());

  if (!hasImage || hasError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-violet-200 via-fuchsia-100 to-cyan-100 text-slate-700">
        <Compass size={14} className="opacity-80" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">
          Destination
        </span>
        <span className="text-[11px] font-black tracking-[0.12em] text-slate-800">
          {destinationCode}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={image}
      alt={imageAlt}
      fill
      sizes="(min-width: 1280px) 7rem, (min-width: 640px) 6.5rem, 5rem"
      className="object-cover transition duration-500 group-hover:scale-[1.03]"
      onError={() => setHasError(true)}
    />
  );
}

function DiscoverySuggestionCard({
  href,
  itemId,
  image,
  imageAlt,
  destinationCode,
  title,
  originCode,
  destinationCodeLabel,
  routeNote,
  compact,
  price,
  displayCurrency,
  expectedOriginCode,
  expectedDestinationCode,
  isPriceLoading,
  isSaved,
  onHeartToggle,
}: {
  href: ComponentProps<typeof Link>["href"];
  itemId: string;
  image: string;
  imageAlt: string;
  destinationCode: string;
  title: string;
  originCode: string;
  destinationCodeLabel: string;
  routeNote: string;
  compact?: boolean;
  price?: HomepageFare;
  displayCurrency: string;
  expectedOriginCode: string;
  expectedDestinationCode: string;
  isPriceLoading?: boolean;
  isSaved: boolean;
  onHeartToggle: (
    event: React.MouseEvent<HTMLButtonElement>,
    itemId: string,
  ) => void;
}) {
  return (
    <Link
      href={href}
      className={`group relative flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white ${compact ? "p-2.5" : "p-3"} shadow-[0_16px_30px_-22px_rgba(15,23,42,0.52)] transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_24px_36px_-20px_rgba(15,23,42,0.6)] active:-translate-y-0.5`}
    >
      <button
        type="button"
        onClick={(event) => onHeartToggle(event, itemId)}
        aria-label={isSaved ? "Remove from saved routes" : "Save route"}
        aria-pressed={isSaved}
        className={`focus-ring absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border shadow-sm backdrop-blur-sm transition ${isSaved ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100" : "border-white/80 bg-white/90 text-slate-500 hover:border-slate-200 hover:text-slate-800"}`}
      >
        <Heart size={15} className={isSaved ? "fill-current" : ""} />
      </button>

      <div
        className={`relative w-full shrink-0 overflow-hidden rounded-lg ${compact ? "h-[98px]" : "h-[136px] md:h-[128px] lg:h-[136px]"}`}
      >
        <DiscoveryCardImage
          image={image}
          imageAlt={imageAlt}
          destinationCode={destinationCode}
        />
      </div>

      <div
        className={`min-w-0 flex-1 ${compact ? "space-y-1.5 pt-2" : "space-y-2 pt-2.5"}`}
      >
        <p
          className={`line-clamp-2 break-words text-slate-900 ${compact ? "text-sm font-extrabold leading-5 pr-10" : "text-sm font-bold leading-5 md:text-[0.95rem] pr-10"}`}
        >
          {title}
        </p>
        <p
          className={`line-clamp-2 text-slate-700 ${compact ? "text-xs font-medium leading-5" : "text-xs font-medium leading-5 md:text-sm"}`}
        >
          {originCode} → {destinationCodeLabel} · {routeNote}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <span className="rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-violet-700">
            Route idea
          </span>
          <p
            className={`font-semibold uppercase tracking-[0.08em] text-slate-500 ${compact ? "text-[11px]" : "text-[11px] md:text-xs"}`}
          >
            One way · Economy · 1 traveler
          </p>
        </div>
      </div>

      <div
        className={`mt-2.5 border-t border-slate-200/90 pt-2.5 ${compact ? "" : "md:mt-3 md:pt-3"}`}
      >
        <DiscoveryPricePill
          price={price}
          displayCurrency={displayCurrency}
          expectedOriginCode={expectedOriginCode}
          expectedDestinationCode={expectedDestinationCode}
          isLoading={Boolean(isPriceLoading)}
        />
      </div>
    </Link>
  );
}

type ProviderBackedHomepageFare = HomepageFare & {
  price: number;
  currency: string;
  search: DestinationPriceSearch;
  expiresAt: string;
};

function hasFreshProviderPrice(
  price?: HomepageFare,
  expectedRoute?: { originCode?: string; destinationCode?: string },
): price is ProviderBackedHomepageFare {
  if (
    price?.providerBacked !== true ||
    typeof price.price !== "number" ||
    !Number.isFinite(price.price) ||
    !price.currency ||
    !price.search ||
    !price.expiresAt
  ) {
    return false;
  }

  if (price.search.currency !== price.currency) return false;

  if (
    expectedRoute?.originCode &&
    price.search.origin.toUpperCase() !== expectedRoute.originCode.toUpperCase()
  ) {
    return false;
  }

  if (
    expectedRoute?.destinationCode &&
    price.search.destination.toUpperCase() !==
      expectedRoute.destinationCode.toUpperCase()
  ) {
    return false;
  }

  const expiresAtMs = Date.parse(price.expiresAt);
  return Number.isFinite(expiresAtMs) && expiresAtMs > Date.now();
}

function buildDestinationCardHref(
  price: HomepageFare | undefined,
  fallbackCity: string,
  expectedRoute?: { originCode?: string; destinationCode?: string },
) {
  const search = hasFreshProviderPrice(price, expectedRoute)
    ? price?.search
    : undefined;

  return search
    ? buildFlightResultsHref(search)
    : `/hotels/results?destination=${encodeURIComponent(fallbackCity)}`;
}

function buildDiscoveryCardHref(
  price: HomepageFare | undefined,
  fallbackHref: ComponentProps<typeof Link>["href"],
  expectedRoute?: { originCode?: string; destinationCode?: string },
) {
  const search = hasFreshProviderPrice(price, expectedRoute)
    ? price?.search
    : undefined;

  return search ? buildFlightResultsHref(search) : fallbackHref;
}

function buildFlightResultsHref(search: DestinationPriceSearch) {
  const query: Record<string, string> = {
    tripType: search.tripType,
    origin: search.origin,
    destination: search.destination,
    departureDate: search.departureDate,
    travelers: String(search.travelers),
    adults: String(search.adults),
    children: String(search.children),
    infants: String(search.infants),
    cabinClass: search.cabinClass,
    currency: search.currency,
  };

  if (search.returnDate) {
    query.returnDate = search.returnDate;
  }

  return {
    pathname: "/flights/results",
    query,
  };
}

function DiscoveryPricePill({
  price,
  displayCurrency,
  expectedOriginCode,
  expectedDestinationCode,
  isLoading,
}: {
  price?: HomepageFare;
  displayCurrency: string;
  expectedOriginCode?: string;
  expectedDestinationCode?: string;
  isLoading: boolean;
}) {
  const currencyRates = useCurrencyRates();
  const hasProviderPrice = hasFreshProviderPrice(price, {
    originCode: expectedOriginCode,
    destinationCode: expectedDestinationCode,
  });

  if (isLoading) {
    return (
      <span
        className="inline-flex h-7 w-28 animate-pulse rounded-full border border-slate-200 bg-slate-100/90"
        aria-label="Checking provider-backed route pricing"
      />
    );
  }

  if (!hasProviderPrice) {
    return (
      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">
        Compare options
      </span>
    );
  }

  const amount = price.price;
  const currency = price.currency;

  if (typeof amount !== "number" || !Number.isFinite(amount) || !currency) {
    return (
      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">
        Compare options
      </span>
    );
  }

  const displayPrice = formatDisplayPrice({
    amount,
    sourceCurrency: currency,
    displayCurrency,
    convertUsdEstimate: true,
    maximumFractionDigits: 0,
    rates: currencyRates.rates,
    isFallbackRate: currencyRates.isFallback,
  });
  const estimateCopy = displayPrice.isConvertedEstimate
    ? " Display estimate; final provider price may differ."
    : " Final price confirmed by provider.";

  return (
    <span
      className="inline-flex rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-800 shadow-sm"
      aria-label={`Provider-backed route price from ${displayPrice.formatted}.${estimateCopy}`}
      title={displayPrice.title}
    >
      from {displayPrice.formatted}
    </span>
  );
}

function DestinationCard({
  city,
  country,
  imageAlt,
  image,
  saveLabelTemplate,
  destinationId,
  price,
  displayCurrency,
  originCode,
  destinationCode,
  href,
  isPriceLoading,
  isSaved,
  onHeartToggle,
}: {
  city: string;
  country: string;
  imageAlt: string;
  image: string;
  saveLabelTemplate: string;
  destinationId: string;
  price?: DestinationPrice;
  displayCurrency: string;
  originCode: string;
  destinationCode: string;
  href: ComponentProps<typeof Link>["href"];
  isPriceLoading: boolean;
  isSaved: boolean;
  onHeartToggle: (
    event: React.MouseEvent<HTMLButtonElement>,
    itemId: string,
  ) => void;
}) {
  return (
    <article className="group min-w-[18.5rem] flex-[0_0_18.5rem] snap-start overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_14px_32px_-24px_rgba(15,23,42,0.65)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_45px_-26px_rgba(15,23,42,0.75)] sm:min-w-[22rem] sm:flex-[0_0_22rem]">
      <Link href={href} className="focus-ring block">
        <div className="relative h-72 sm:h-80">
          <Image
            src={image}
            alt={imageAlt}
            fill
            quality={92}
            sizes="(min-width: 1280px) 22rem, (min-width: 640px) 22rem, 18.5rem"
            className="object-cover transition duration-500 group-hover:scale-105"
          />

          <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-slate-950/72 via-slate-950/24 to-transparent" />

          <button
            type="button"
            className={`focus-ring absolute right-3 top-3 z-0 flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur transition duration-200 ${
              isSaved
                ? "border-rose-200/90 bg-rose-500/90 text-white shadow-sm shadow-rose-900/20 hover:bg-rose-500"
                : "border-white/30 bg-white/20 text-white hover:bg-white/30"
            }`}
            aria-label={saveLabelTemplate.replace("{{city}}", city)}
            aria-pressed={isSaved}
            onClick={(event) => onHeartToggle(event, destinationId)}
          >
            <Heart size={17} className={isSaved ? "fill-current" : ""} />
          </button>

          <div className="absolute bottom-4 left-4 pr-4 text-white">
            <h3 className="text-2xl font-black tracking-tight drop-shadow-sm">
              {city}
            </h3>
            <p className="text-sm font-semibold text-white/95 drop-shadow-sm">
              {country}
            </p>
          </div>
        </div>

        <div className="flex items-center p-4">
          <DestinationPricePill
            price={price}
            displayCurrency={displayCurrency}
            expectedOriginCode={originCode}
            expectedDestinationCode={destinationCode}
            isLoading={isPriceLoading}
          />
        </div>
      </Link>
    </article>
  );
}

function DestinationPricePill({
  price,
  displayCurrency,
  expectedOriginCode,
  expectedDestinationCode,
  isLoading,
}: {
  price?: DestinationPrice;
  displayCurrency: string;
  expectedOriginCode?: string;
  expectedDestinationCode?: string;
  isLoading: boolean;
}) {
  const currencyRates = useCurrencyRates();
  const hasProviderPrice = hasFreshProviderPrice(price, {
    originCode: expectedOriginCode,
    destinationCode: expectedDestinationCode,
  });

  if (isLoading) {
    return (
      <span
        className="inline-flex h-8 w-28 animate-pulse rounded-full border border-slate-200 bg-slate-100/90"
        aria-label="Prices update with provider results"
      />
    );
  }

  if (!hasProviderPrice) {
    return (
      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50/90 px-3 py-1.5 text-sm font-medium text-slate-700">
        Explore fares
      </span>
    );
  }

  const amount = price.price;
  const currency = price.currency;

  if (typeof amount !== "number" || !Number.isFinite(amount) || !currency) {
    return (
      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50/90 px-3 py-1.5 text-sm font-medium text-slate-700">
        Explore fares
      </span>
    );
  }

  const displayPrice = formatDisplayPrice({
    amount,
    sourceCurrency: currency,
    displayCurrency,
    convertUsdEstimate: true,
    maximumFractionDigits: 0,
    rates: currencyRates.rates,
    isFallbackRate: currencyRates.isFallback,
  });
  const estimateCopy = displayPrice.isConvertedEstimate
    ? " Display estimate; final provider price may differ."
    : " Final price confirmed by provider.";

  return (
    <span
      className="inline-flex rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm"
      aria-label={`Provider-backed fare estimate from ${displayPrice.formatted}.${estimateCopy}`}
      title={displayPrice.title}
    >
      from {displayPrice.formatted}
    </span>
  );
}

function PromoPanel({
  tone,
  title,
  body,
  cta,
  href,
  icon,
}: {
  tone: "violet" | "amber";
  title: string;
  body: string;
  cta: string;
  href: string;
  icon: ReactNode;
}) {
  const isViolet = tone === "violet";

  return (
    <article
      className={`relative min-h-56 overflow-hidden rounded-xl p-8 ${
        isViolet ? "bg-[#f1e8ff]" : "bg-[#eaf2ff]"
      }`}
    >
      <div className="relative z-10 max-w-xs">
        <h2 className="text-2xl font-semibold leading-tight text-slate-800 sm:font-bold sm:text-slate-900">
          {title}
        </h2>

        <p className="mt-4 text-sm font-semibold leading-6 text-slate-700">
          {body}
        </p>

        <LinkButton
          href={href}
          variant="primary"
          size="md"
          className={`mt-5 font-semibold ${
            isViolet
              ? "bg-violet-600 hover:bg-violet-700"
              : "bg-[#2563eb] hover:bg-[#1d4ed8]"
          }`}
        >
          {cta}
          <ArrowRight size={16} />
        </LinkButton>
      </div>

      <div
        className={`absolute bottom-5 right-6 flex h-40 w-40 items-center justify-center rounded-full ${
          isViolet
            ? "bg-white/55 text-violet-600"
            : "bg-white/70 text-[#2563eb]"
        }`}
      >
        <Sparkles className="absolute left-5 top-5 opacity-40" size={24} />

        <CircleDollarSign
          className="absolute right-7 top-7 opacity-40"
          size={26}
        />

        {icon}
      </div>
    </article>
  );
}
