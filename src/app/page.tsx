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
import {
  getPopularDestinationFareCandidatesByRegion,
  getPopularDestinationsByRegion,
} from "@/data/marketHomeContent";
import { getGeneralFaqs, homepageMobileFaqLimit } from "@/content/faqs";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import { buildHomepageRouteCardFlightHref } from "@/lib/home/homepageRouteCardLinks";
import { translateHomeDiscoveryField } from "@/lib/i18n/homeDiscovery";
import { translations as enTranslations } from "@/lib/i18n/en";
import {
  readSavedTripIds,
  toggleSavedTripId,
  writeSavedTripIds,
} from "@/lib/saved-trips-local";


function CompareOffersIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="h-12 w-12"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" rx="18" fill="url(#compareTile)" />
      <rect x="13" y="18" width="24" height="17" rx="5" fill="white" />
      <rect x="17" y="23" width="12" height="3" rx="1.5" fill="#4F46E5" />
      <rect x="17" y="29" width="16" height="2" rx="1" fill="#C7D2FE" />
      <rect x="29" y="25" width="23" height="18" rx="5" fill="#F8FAFC" />
      <rect x="34" y="30" width="10" height="3" rx="1.5" fill="#0D9488" />
      <rect x="34" y="36" width="13" height="2" rx="1" fill="#99F6E4" />
      <circle cx="29" cy="34" r="11" fill="#EEF2FF" fillOpacity="0.78" />
      <circle cx="29" cy="34" r="8" stroke="#312E81" strokeWidth="3" />
      <path
        d="M35 40L43 48"
        stroke="#312E81"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M23.5 34.5L27 38L34.5 30"
        stroke="#14B8A6"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="compareTile" x1="6" y1="5" x2="58" y2="59" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EEF2FF" />
          <stop offset="1" stopColor="#ECFEFF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function PricingContextIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="h-12 w-12"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" rx="18" fill="url(#pricingTile)" />
      <path
        d="M19 13H43C45.2091 13 47 14.7909 47 17V49L42.5 46.5L38 49L33.5 46.5L29 49L24.5 46.5L19 49V13Z"
        fill="white"
      />
      <rect x="24" y="21" width="17" height="3" rx="1.5" fill="#7C3AED" />
      <rect x="24" y="29" width="12" height="2.5" rx="1.25" fill="#DDD6FE" />
      <rect x="24" y="36" width="15" height="2.5" rx="1.25" fill="#DDD6FE" />
      <circle cx="43" cy="41" r="9" fill="#CCFBF1" />
      <path
        d="M39.5 41.5L42 44L47 38.5"
        stroke="#0F766E"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="20" r="5" fill="#FDE68A" />
      <path d="M18 17.6V22.4" stroke="#A16207" strokeWidth="1.8" strokeLinecap="round" />
      <defs>
        <linearGradient id="pricingTile" x1="5" y1="5" x2="59" y2="59" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F5F3FF" />
          <stop offset="1" stopColor="#EFF6FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function SecureHandoffIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="h-12 w-12"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" rx="18" fill="url(#handoffTile)" />
      <rect x="30" y="16" width="22" height="18" rx="5" fill="white" />
      <rect x="34" y="21" width="11" height="3" rx="1.5" fill="#2563EB" />
      <rect x="34" y="28" width="14" height="2" rx="1" fill="#BFDBFE" />
      <path
        d="M15 20L29 15L43 20V31C43 41.5 36 47.5 29 50C22 47.5 15 41.5 15 31V20Z"
        fill="#EEF2FF"
        stroke="#312E81"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <rect x="24" y="29" width="10" height="9" rx="2" fill="#14B8A6" />
      <path
        d="M26 29V26.5C26 24.8 27.3 23.5 29 23.5C30.7 23.5 32 24.8 32 26.5V29"
        stroke="#0F766E"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M41 42H50M50 42L46 38M50 42L46 46"
        stroke="#2563EB"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="handoffTile" x1="6" y1="5" x2="58" y2="59" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EFF6FF" />
          <stop offset="1" stopColor="#F0FDFA" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const heroImage =
  "/images/premium/homepage/kurioticket-homepage-hero-businesswoman-modern-city-luggage-001.jpg";

const POPULAR_DESTINATION_VISIBLE_CARD_COUNT = 8;
const HOME_DISCOVERY_MOBILE_VISIBLE_CARD_COUNT =
  HOME_DISCOVERY_VISIBLE_CARD_COUNT + 2;

const destinationImageFallback =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95";

const HOME_POPULAR_DESTINATION_CITY_KEYS: Record<string, string> = {
  Accra: "homePopularDestinationCity.accra",
  "Addis Ababa": "homePopularDestinationCity.addisAbaba",
  Amsterdam: "homePopularDestinationCity.amsterdam",
  Atlanta: "homePopularDestinationCity.atlanta",
  Bali: "homePopularDestinationCity.bali",
  Bangkok: "homePopularDestinationCity.bangkok",
  Barcelona: "homePopularDestinationCity.barcelona",
  Bogota: "homePopularDestinationCity.bogota",
  Boston: "homePopularDestinationCity.boston",
  "Buenos Aires": "homePopularDestinationCity.buenosAires",
  Cairo: "homePopularDestinationCity.cairo",
  Calgary: "homePopularDestinationCity.calgary",
  Cancun: "homePopularDestinationCity.cancun",
  "Cape Town": "homePopularDestinationCity.capeTown",
  Chicago: "homePopularDestinationCity.chicago",
  Dallas: "homePopularDestinationCity.dallas",
  "Dar es Salaam": "homePopularDestinationCity.darEsSalaam",
  Denver: "homePopularDestinationCity.denver",
  Doha: "homePopularDestinationCity.doha",
  Dubai: "homePopularDestinationCity.dubai",
  Halifax: "homePopularDestinationCity.halifax",
  Hanoi: "homePopularDestinationCity.hanoi",
  "Hong Kong": "homePopularDestinationCity.hongKong",
  Istanbul: "homePopularDestinationCity.istanbul",
  Jeddah: "homePopularDestinationCity.jeddah",
  Johannesburg: "homePopularDestinationCity.johannesburg",
  "Kuala Lumpur": "homePopularDestinationCity.kualaLumpur",
  "Las Vegas": "homePopularDestinationCity.lasVegas",
  Lima: "homePopularDestinationCity.lima",
  Lisbon: "homePopularDestinationCity.lisbon",
  London: "homePopularDestinationCity.london",
  "Los Angeles": "homePopularDestinationCity.losAngeles",
  Madrid: "homePopularDestinationCity.madrid",
  Manila: "homePopularDestinationCity.manila",
  Mauritius: "homePopularDestinationCity.mauritius",
  Miami: "homePopularDestinationCity.miami",
  Montreal: "homePopularDestinationCity.montreal",
  Nairobi: "homePopularDestinationCity.nairobi",
  "New York": "homePopularDestinationCity.newYork",
  Orlando: "homePopularDestinationCity.orlando",
  Paris: "homePopularDestinationCity.paris",
  Phoenix: "homePopularDestinationCity.phoenix",
  "Rio de Janeiro": "homePopularDestinationCity.rioDeJaneiro",
  Riyadh: "homePopularDestinationCity.riyadh",
  Rome: "homePopularDestinationCity.rome",
  "San Francisco": "homePopularDestinationCity.sanFrancisco",
  "San Jose": "homePopularDestinationCity.sanJose",
  Santiago: "homePopularDestinationCity.santiago",
  Seattle: "homePopularDestinationCity.seattle",
  Seoul: "homePopularDestinationCity.seoul",
  Singapore: "homePopularDestinationCity.singapore",
  Taipei: "homePopularDestinationCity.taipei",
  Toronto: "homePopularDestinationCity.toronto",
  Vancouver: "homePopularDestinationCity.vancouver",
  Vienna: "homePopularDestinationCity.vienna",
  Washington: "homePopularDestinationCity.washington",
  Zanzibar: "homePopularDestinationCity.zanzibar",
  Zurich: "homePopularDestinationCity.zurich",
};

const HOME_POPULAR_DESTINATION_COUNTRY_KEYS: Record<string, string> = {
  Argentina: "homePopularDestinationCountry.argentina",
  Austria: "homePopularDestinationCountry.austria",
  Brazil: "homePopularDestinationCountry.brazil",
  Canada: "homePopularDestinationCountry.canada",
  Chile: "homePopularDestinationCountry.chile",
  Colombia: "homePopularDestinationCountry.colombia",
  "Costa Rica": "homePopularDestinationCountry.costaRica",
  Egypt: "homePopularDestinationCountry.egypt",
  Ethiopia: "homePopularDestinationCountry.ethiopia",
  France: "homePopularDestinationCountry.france",
  Ghana: "homePopularDestinationCountry.ghana",
  "Hong Kong": "homePopularDestinationCountry.hongKong",
  Indonesia: "homePopularDestinationCountry.indonesia",
  Italy: "homePopularDestinationCountry.italy",
  Kenya: "homePopularDestinationCountry.kenya",
  Malaysia: "homePopularDestinationCountry.malaysia",
  Mauritius: "homePopularDestinationCountry.mauritius",
  Mexico: "homePopularDestinationCountry.mexico",
  Netherlands: "homePopularDestinationCountry.netherlands",
  Peru: "homePopularDestinationCountry.peru",
  Philippines: "homePopularDestinationCountry.philippines",
  Portugal: "homePopularDestinationCountry.portugal",
  Qatar: "homePopularDestinationCountry.qatar",
  "Saudi Arabia": "homePopularDestinationCountry.saudiArabia",
  Singapore: "homePopularDestinationCountry.singapore",
  "South Africa": "homePopularDestinationCountry.southAfrica",
  "South Korea": "homePopularDestinationCountry.southKorea",
  Spain: "homePopularDestinationCountry.spain",
  Switzerland: "homePopularDestinationCountry.switzerland",
  Taiwan: "homePopularDestinationCountry.taiwan",
  Tanzania: "homePopularDestinationCountry.tanzania",
  Thailand: "homePopularDestinationCountry.thailand",
  Türkiye: "homePopularDestinationCountry.turkiye",
  "United Arab Emirates": "homePopularDestinationCountry.unitedArabEmirates",
  "United Kingdom": "homePopularDestinationCountry.unitedKingdom",
  "United States": "homePopularDestinationCountry.unitedStates",
  Vietnam: "homePopularDestinationCountry.vietnam",
};

function translatePopularDestinationDisplayLabel(
  dictionary: Record<string, string>,
  fallbackLabel: string,
  labelKeys: Record<string, string>,
) {
  const translationKey = labelKeys[fallbackLabel];

  return translationKey
    ? (dictionary[translationKey] ??
        enTranslations[translationKey] ??
        fallbackLabel)
    : fallbackLabel;
}

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
  priceState?: "fresh" | "last_known_good" | "none";
  cachedProviderBacked?: boolean;
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
  priceState: "fresh" | "last_known_good" | "none";
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
  const { locale, t: dictionary } = useLocale();
  const { mode: regionCode, selectedOption } = useRegion();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterMessage, setNewsletterMessage] = useState("");
  const [newsletterStatus, setNewsletterStatus] =
    useState<NewsletterStatus>("idle");
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

  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const translateDiscoveryItemCopy = (
    item: HomeDiscoveryCardItem,
    field: "title" | "routeNote",
  ) => translateHomeDiscoveryField(dictionary, item, field);
  const translatedFaqs = getGeneralFaqs(t);

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
  const popularDestinationFareCandidates = useMemo(
    () => getPopularDestinationFareCandidatesByRegion(regionCode).items,
    [regionCode],
  );
  const visiblePopularDestinations = useMemo(() => {
    const replacementAwareDestinations = destinationPriceState.loading
      ? popularDestinations
      : popularDestinationFareCandidates;
    const destinationsWithIndex = replacementAwareDestinations.map(
      (destination, index) => {
        const price = destinationPriceState.prices[destination.id];
        const hasFreshPrice = hasFreshProviderPrice(price, {
          originCode: destination.originCode,
          destinationCode: destination.code,
        });

        return { destination, hasFreshPrice, index };
      },
    );

    if (destinationPriceState.loading) {
      return destinationsWithIndex
        .slice(0, POPULAR_DESTINATION_VISIBLE_CARD_COUNT)
        .map(({ destination }) => destination);
    }

    return destinationsWithIndex
      .sort(
        (first, second) =>
          Number(second.hasFreshPrice) - Number(first.hasFreshPrice) ||
          first.index - second.index,
      )
      .slice(0, POPULAR_DESTINATION_VISIBLE_CARD_COUNT)
      .map(({ destination }) => destination);
  }, [
    destinationPriceState.loading,
    destinationPriceState.prices,
    popularDestinationFareCandidates,
    popularDestinations,
  ]);

  const fallbackDiscoveryCards = useMemo<HomeDiscoveryFareCard[]>(
    () =>
      getHomeDiscoveryByRegion(regionCode)
        .slice(0, HOME_DISCOVERY_MOBILE_VISIBLE_CARD_COUNT)
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
  const desktopDiscoveryCards = useMemo(
    () => discoveryCards.slice(0, HOME_DISCOVERY_VISIBLE_CARD_COUNT),
    [discoveryCards],
  );
  const mobileDiscoveryGroups = useMemo(() => {
    const groups = [];

    for (let index = 0; index < discoveryCards.length; index += 6) {
      groups.push(discoveryCards.slice(index, index + 6));
    }

    return groups;
  }, [discoveryCards]);

  const handleNewsletterSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (newsletterPending) return;

    const email = newsletterEmail.trim();
    if (!isNewsletterEmail(email)) {
      setNewsletterStatus("error");
      setNewsletterMessage(t("homeNewsletterInvalidEmail"));
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
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
      } | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || t("homeNewsletterUnableSubscribe"));
      }

      setNewsletterStatus("success");
      setNewsletterMessage(t("homeNewsletterThanks"));
      setNewsletterEmail("");
    } catch (error) {
      setNewsletterStatus("error");
      setNewsletterMessage(
        error instanceof Error ? error.message : t("homeNewsletterTryAgain"),
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
            destinations: popularDestinationFareCandidates.map(
              ({ id, code, originCode }) => ({
                id,
                code,
                originCode,
              }),
            ),
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
    popularDestinationFareCandidates,
    popularDestinationMarket,
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
            limit: HOME_DISCOVERY_MOBILE_VISIBLE_CARD_COUNT,
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
        <section className="relative min-h-[420px] overflow-visible bg-slate-950 sm:min-h-[550px] lg:min-h-[610px]">
          <div className="absolute inset-0">
            <Image
              src={heroImage}
              alt={t("homeHeroImageAlt")}
              fill
              priority
              sizes="100vw"
              className="object-cover object-[62%_center] sm:object-[60%_center] lg:object-[58%_48%]"
            />
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-[88%] bg-gradient-to-r from-slate-950/68 via-slate-950/28 to-transparent sm:w-[72%] lg:w-[62%]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/22 via-transparent to-slate-950/30" />

          <div className="page-shell relative z-10 pb-0 pt-8 sm:pb-44 sm:pt-10 lg:pb-48 lg:pt-12">
            <div className="grid content-start gap-5 pb-0 sm:gap-4 sm:pb-4 lg:max-w-[1200px]">
              <div className="max-w-[21rem] sm:max-w-2xl lg:max-w-3xl">
                <h1 className="max-w-3xl text-[1.82rem] font-semibold leading-[1.08] tracking-[-0.024em] text-white text-balance drop-shadow-[0_3px_16px_rgba(2,6,23,0.7)] sm:text-[2.15rem] lg:text-[2.65rem]">
                  {t("homeHeroTitle")}
                </h1>

                <p className="mt-3 max-w-[18.5rem] text-sm font-medium leading-6 text-white/90 drop-shadow-[0_2px_10px_rgba(2,6,23,0.68)] sm:max-w-xl sm:text-base sm:leading-7 lg:text-[1.05rem]">
                  {t("homeHeroSubtitle")}
                </p>
              </div>
            </div>
          </div>

          <div className="page-shell absolute inset-x-0 bottom-[-360px] z-30 sm:hidden">
            <SearchTabs
              t={t as unknown as Record<string, string>}
              compactHero
              locale={locale}
            />
          </div>

          <div className="page-shell absolute inset-x-0 bottom-[-52px] z-30 hidden sm:block lg:bottom-[-56px]">
            <div className="mx-auto max-w-[1280px]">
              <SearchTabs
                t={t as unknown as Record<string, string>}
                compactHero
                locale={locale}
              />
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200/75 bg-[#fbfaf7] pb-7 pt-[48rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:border-y-0 sm:bg-transparent sm:pb-5 sm:pt-24 sm:shadow-none lg:pt-28">
          <div className="page-shell">
            <div className="flex items-center">
              <h2 className="text-xl font-bold tracking-normal text-slate-900 sm:text-2xl">
                {t("homePopularDestinations")}
              </h2>
            </div>

            <div className="relative mt-6">
              <button
                type="button"
                aria-label={t("homePreviousDestinations")}
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
                className="-mx-2 flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {visiblePopularDestinations.map((destination) => {
                  const price = destinationPriceState.prices[destination.id];
                  const city = translatePopularDestinationDisplayLabel(
                    dictionary,
                    destination.city,
                    HOME_POPULAR_DESTINATION_CITY_KEYS,
                  );
                  const country = translatePopularDestinationDisplayLabel(
                    dictionary,
                    destination.country,
                    HOME_POPULAR_DESTINATION_COUNTRY_KEYS,
                  );

                  return (
                    <DestinationCard
                      key={destination.id}
                      city={city}
                      country={country}
                      imageAlt={destination.imageAlt}
                      saveLabelTemplate={t("homeSaveDestination")}
                      image={destination.image}
                      destinationId={destination.id}
                      price={price}
                      displayCurrency={selectedOption.currency}
                      originCode={destination.originCode}
                      destinationCode={destination.code}
                      href={buildDestinationCardHref(price, {
                        originCode: destination.originCode,
                        destinationCode: destination.code,
                        displayCurrency: selectedOption.currency,
                        market: regionCode,
                      })}
                      isPriceLoading={destinationPriceState.loading}
                      isSaved={savedTripIds.includes(destination.id)}
                      onHeartToggle={handleSavedTripToggle}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="page-shell bg-white py-7 sm:bg-transparent sm:py-6">
          <div className="space-y-4 sm:space-y-5">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                {t("homeDiscoveryTitle")}
              </h2>
              <p className="text-sm font-normal leading-6 text-slate-600 sm:text-base">
                {t("homeDiscoverySubtitle")}
              </p>
            </div>
            <div className="flex items-center justify-end sm:hidden">
              <div className="pointer-events-none mb-2 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                {t("homeDiscoverySwipeMore")}
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
                        href={buildDiscoveryCardHref(card.fare, {
                          originCode: card.item.originCode,
                          destinationCode: card.item.destinationCode,
                          displayCurrency: selectedOption.currency,
                          market: regionCode,
                        })}
                        itemId={card.item.id}
                        image={card.item.image}
                        imageAlt={card.item.imageAlt}
                        destinationCode={card.item.destinationCode}
                        title={translateDiscoveryItemCopy(card.item, "title")}
                        originCode={card.item.originCode}
                        destinationCodeLabel={card.item.destinationCode}
                        routeNote={translateDiscoveryItemCopy(
                          card.item,
                          "routeNote",
                        )}
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
              {desktopDiscoveryCards.map((card) => {
                return (
                  <DiscoverySuggestionCard
                    key={card.item.id}
                    href={buildDiscoveryCardHref(card.fare, {
                      originCode: card.item.originCode,
                      destinationCode: card.item.destinationCode,
                      displayCurrency: selectedOption.currency,
                      market: regionCode,
                    })}
                    itemId={card.item.id}
                    image={card.item.image}
                    imageAlt={card.item.imageAlt}
                    destinationCode={card.item.destinationCode}
                    title={translateDiscoveryItemCopy(card.item, "title")}
                    originCode={card.item.originCode}
                    destinationCodeLabel={card.item.destinationCode}
                    routeNote={translateDiscoveryItemCopy(
                      card.item,
                      "routeNote",
                    )}
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

        <section className="mt-6 border-y border-slate-300/80 bg-gradient-to-b from-slate-50/90 via-indigo-50/35 to-slate-50/80 sm:mt-9">
          <div className="page-shell py-9 sm:py-11">
            <div className="space-y-4">
              <div className="max-w-3xl space-y-1.5">
                <h2 className="text-xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-2xl">
                  {t("homeTrustTitle")}
                </h2>
                <p className="text-sm font-medium leading-6 text-slate-700 sm:text-base">
                  {t("homeTrustSubtitle")}
                </p>
              </div>

              <div className="mt-4 divide-y divide-slate-200/70 md:grid md:grid-cols-3 md:gap-6 md:divide-y-0 md:[&>article+article]:border-l md:[&>article+article]:border-slate-200/70 md:[&>article+article]:pl-6">
                <article className="flex items-start gap-3.5 py-3.5 first:pt-1 last:pb-1 md:px-2 md:py-2">
                  <div className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-indigo-100/80">
                    <CompareOffersIllustration />
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
                  <div className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-violet-100/80">
                    <PricingContextIllustration />
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
                  <div className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-blue-100/80">
                    <SecureHandoffIllustration />
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
            <h2 className="text-xl font-semibold tracking-normal text-slate-800 sm:font-bold sm:text-slate-900">
              {t("faqHeading")}
            </h2>
            <p className="text-sm font-medium leading-6 text-slate-700 sm:text-base">
              {t("faqIntro")}
            </p>
          </div>

          <FaqAccordion
            items={translatedFaqs}
            mobileLimit={homepageMobileFaqLimit}
            className="mt-5"
          />

          <Link
            href="/faq"
            className="mt-4 inline-flex text-sm font-bold text-indigo-700 underline-offset-4 hover:text-indigo-900 hover:underline sm:hidden"
          >
            {t("faqViewAll")}
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
                    {newsletterPending
                      ? t("homeSubscribing")
                      : t("homeSubscribe")}
                  </button>
                </form>
              </div>

              <p className="mt-2 text-[11px] font-semibold leading-4 text-slate-600 sm:text-xs">
                {t("homeNewsletterConsent")}
              </p>

              {newsletterMessage ? (
                <p
                  className={`mt-2 text-xs font-semibold sm:text-sm ${
                    newsletterStatus === "error"
                      ? "text-red-700"
                      : "text-slate-700"
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
  destinationFallbackLabel,
}: {
  image: string;
  imageAlt: string;
  destinationCode: string;
  destinationFallbackLabel: string;
}) {
  const [hasError, setHasError] = useState(false);
  const hasImage = Boolean(image?.trim());

  if (!hasImage || hasError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-violet-200 via-fuchsia-100 to-cyan-100 text-slate-700">
        <Compass size={14} className="opacity-80" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">
          {destinationFallbackLabel}
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
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";

  return (
    <Link
      href={href}
      className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-transparent shadow-[0_16px_30px_-22px_rgba(15,23,42,0.52)] transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_24px_36px_-20px_rgba(15,23,42,0.6)] active:-translate-y-0.5"
    >
      <button
        type="button"
        onClick={(event) => onHeartToggle(event, itemId)}
        aria-label={
          isSaved ? t("homeRemoveFromSavedRoutes") : t("homeSaveRoute")
        }
        aria-pressed={isSaved}
        className={`focus-ring absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border shadow-sm backdrop-blur-sm transition ${isSaved ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100" : "border-white/80 bg-white/90 text-slate-500 hover:border-slate-200 hover:text-slate-800"}`}
      >
        <Heart size={15} className={isSaved ? "fill-current" : ""} />
      </button>

      <div
        className={`relative w-full shrink-0 overflow-hidden ${compact ? "h-[148px]" : "h-[196px] md:h-[190px] lg:h-[198px]"}`}
      >
        <DiscoveryCardImage
          image={image}
          imageAlt={imageAlt}
          destinationCode={destinationCode}
          destinationFallbackLabel={t("destinationImageFallback")}
        />
      </div>

      <div
        className={`min-w-0 flex-1 bg-white ${compact ? "space-y-1.5 px-2.5 pt-2.5" : "space-y-2 px-3 pt-3"}`}
      >
        <p
          className={`line-clamp-2 break-words text-slate-950 ${compact ? "pr-10 text-sm font-bold leading-[1.32]" : "pr-10 text-sm font-bold leading-[1.35] md:text-[0.95rem]"}`}
        >
          {title}
        </p>
        <p
          className={`line-clamp-2 text-slate-600 ${compact ? "text-xs font-medium leading-5" : "text-xs font-medium leading-5 md:text-sm"}`}
        >
          {originCode} → {destinationCodeLabel} · {routeNote}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <span className="rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-violet-700">
            {t("homeDiscoveryRouteIdeaBadge")}
          </span>
          <p
            className={`font-semibold uppercase tracking-[0.08em] text-slate-500 ${compact ? "text-[11px]" : "text-[11px] md:text-xs"}`}
          >
            {t("oneWay")} · {t("economy")} · 1 {t("travelerSingular")}
          </p>
        </div>
      </div>

      <div
        className={`border-t border-slate-200/90 bg-white ${compact ? "px-2.5 pb-2.5 pt-2.5" : "px-3 pb-3 pt-3"}`}
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

  if (
    price.priceState === "last_known_good" ||
    price.cachedProviderBacked === true
  ) {
    return true;
  }

  const expiresAtMs = Date.parse(price.expiresAt);
  return Number.isFinite(expiresAtMs) && expiresAtMs > Date.now();
}

function buildDestinationCardHref(
  price: HomepageFare | undefined,
  options: {
    originCode: string;
    destinationCode: string;
    displayCurrency: string;
    market: string;
  },
) {
  return buildRouteCardHref(price, options);
}

function buildDiscoveryCardHref(
  price: HomepageFare | undefined,
  options: {
    originCode: string;
    destinationCode: string;
    displayCurrency: string;
    market: string;
  },
) {
  return buildRouteCardHref(price, options);
}

function buildRouteCardHref(
  price: HomepageFare | undefined,
  options: {
    originCode: string;
    destinationCode: string;
    displayCurrency: string;
    market: string;
  },
) {
  const expectedRoute = {
    originCode: options.originCode,
    destinationCode: options.destinationCode,
  };
  const fareSearch = hasFreshProviderPrice(price, expectedRoute)
    ? price.search
    : undefined;

  return (
    buildHomepageRouteCardFlightHref({
      fareSearch,
      route: expectedRoute,
      displayCurrency: options.displayCurrency,
      market: options.market,
    }) ?? "/flights"
  );
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
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const currencyRates = useCurrencyRates();
  const hasProviderPrice = hasFreshProviderPrice(price, {
    originCode: expectedOriginCode,
    destinationCode: expectedDestinationCode,
  });

  if (isLoading) {
    return (
      <span
        className="inline-flex h-10 w-[9rem] animate-pulse rounded-full border border-slate-300 bg-white shadow-[0_10px_22px_-15px_rgba(15,23,42,0.85)] sm:h-11 sm:w-[10rem]"
        aria-label={t("homeCheckingProviderRoutePricing")}
      />
    );
  }

  if (!hasProviderPrice) {
    return (
      <span className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold leading-5 tracking-tight text-slate-900 shadow-[0_10px_22px_-15px_rgba(15,23,42,0.85)] sm:text-base sm:leading-6">
        {t("homeCompareOptions")}
      </span>
    );
  }

  const amount = price.price;
  const currency = price.currency;

  if (typeof amount !== "number" || !Number.isFinite(amount) || !currency) {
    return (
      <span className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold leading-5 tracking-tight text-slate-900 shadow-[0_10px_22px_-15px_rgba(15,23,42,0.85)] sm:text-base sm:leading-6">
        {t("homeCompareOptions")}
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
    ? ` ${t("displayEstimateFinalProviderMayDiffer")}`
    : ` ${t("finalPriceConfirmedByProvider")}`;

  return (
    <span
      className="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 leading-6 tracking-tight text-slate-950 shadow-[0_10px_22px_-15px_rgba(15,23,42,0.85)] sm:leading-7"
      aria-label={`Provider-backed route price from ${displayPrice.formatted}.${estimateCopy}`}
      title={displayPrice.title}
    >
      <span className="text-sm font-semibold text-slate-600 sm:text-base">
        {t("fromPrice").toLowerCase()}
      </span>
      <span className="text-base font-bold text-slate-950 sm:text-lg">
        {displayPrice.formatted}
      </span>
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
  const [imageSource, setImageSource] = useState(image);

  return (
    <article className="group min-w-[18.5rem] flex-[0_0_18.5rem] snap-start overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_14px_32px_-24px_rgba(15,23,42,0.65)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_45px_-26px_rgba(15,23,42,0.75)] sm:min-w-[22rem] sm:flex-[0_0_22rem]">
      <Link href={href} className="focus-ring block">
        <div className="relative h-72 sm:h-80">
          <Image
            src={imageSource}
            alt={imageAlt}
            fill
            quality={92}
            sizes="(min-width: 1280px) 22rem, (min-width: 640px) 22rem, 18.5rem"
            className="object-cover transition duration-500 group-hover:scale-105"
            onError={() => {
              if (imageSource !== destinationImageFallback) {
                setImageSource(destinationImageFallback);
              }
            }}
          />

          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/55 via-slate-950/16 to-transparent" />

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

          <div className="absolute bottom-4 left-4 z-10 pr-4 text-white [text-shadow:0_2px_12px_rgba(15,23,42,0.55)]">
            <h3 className="text-xl font-black tracking-tight sm:text-2xl">
              {city}
            </h3>
            <p className="text-sm font-semibold text-white/95">
              {country}
            </p>
          </div>
        </div>

        <div className="flex min-h-[4.5rem] items-end px-4 pb-4 pt-3">
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
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const currencyRates = useCurrencyRates();
  const hasProviderPrice = hasFreshProviderPrice(price, {
    originCode: expectedOriginCode,
    destinationCode: expectedDestinationCode,
  });

  if (isLoading) {
    return (
      <span
        className="inline-flex h-9 w-32 animate-pulse rounded-full border border-slate-300 bg-white shadow-[0_8px_18px_-14px_rgba(15,23,42,0.8)]"
        aria-label={t("homePricesUpdateWithProviderResults")}
      />
    );
  }

  if (!hasProviderPrice) {
    return (
      <span className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-[15px] font-bold text-slate-800 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.8)]">
        {t("homeExploreFares")}
      </span>
    );
  }

  const amount = price.price;
  const currency = price.currency;

  if (typeof amount !== "number" || !Number.isFinite(amount) || !currency) {
    return (
      <span className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-[15px] font-bold text-slate-800 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.8)]">
        {t("homeExploreFares")}
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
    ? ` ${t("displayEstimateFinalProviderMayDiffer")}`
    : ` ${t("finalPriceConfirmedByProvider")}`;

  return (
    <span
      className="inline-flex items-baseline gap-1.5 leading-6 tracking-tight text-slate-950"
      aria-label={`Provider-backed fare estimate from ${displayPrice.formatted}.${estimateCopy}`}
      title={displayPrice.title}
    >
      <span className="text-[15px] font-semibold text-slate-600 sm:text-base">
        {t("fromPrice").toLowerCase()}
      </span>
      <span className="text-[17px] font-bold text-slate-950 sm:text-lg">
        {displayPrice.formatted}
      </span>
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
        <h2 className="text-xl font-semibold leading-tight text-slate-800 sm:font-bold sm:text-slate-900">
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
