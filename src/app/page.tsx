"use client";

import Image from "next/image";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { hasFreshProviderPrice } from "@/lib/homepageFareDisplay";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
} from "lucide-react";

import { AppHeader } from "@/components/layout/AppHeader";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { Footer } from "@/components/layout/Footer";
import { SearchTabs } from "@/components/search/SearchTabs";
import { LinkButton } from "@/components/ui/Button";
import {
  HOME_DISCOVERY_IMAGE_CARD_COUNT,
  getHomeDiscoveryImageCardsByRegion,
  getHomepageRegionalRouteCards,
} from "@/data/homeDiscovery";
import { getHomepageHeroImageForMarket } from "@/data/images/homepageHeroImage";
import type { HomepageHotelCountryCard } from "@/data/homepageHotelCountryCards";
import {
  getPopularDestinationFareCandidatesByRegion,
  getPopularDestinationsByRegion,
} from "@/data/marketHomeContent";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import { buildHomepageRouteCardFlightHref } from "@/lib/home/homepageRouteCardLinks";
import {
  getCarouselArrowRenderState,
  getCarouselStartScrollLeft,
  getLogicalCarouselScrollState,
} from "@/lib/home/homepageCarouselScroll";
import { translateHomeDiscoveryField } from "@/lib/i18n/homeDiscovery";
import { translations as enTranslations } from "@/lib/i18n/en";
import { useSession } from "next-auth/react";
import {
  readSavedTripIds,
  toggleSavedTripId,
  writeSavedTripIds,
} from "@/lib/saved-trips-local";
import {
  deleteBackendTrip,
  fetchBackendSavedTrips,
  getSavedTripLocalId,
  saveBackendTrip,
  type SavedTripDisplayDetails,
} from "@/lib/saved-trips-api";


const addDaysToIsoDate = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  const year = next.getFullYear();
  const month = String(next.getMonth() + 1).padStart(2, "0");
  const day = String(next.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};


type CountryDirectoryCategory = "Flights" | "Hotels" | "Cars";

type CountryDirectoryLink = {
  label: string;
  href: ComponentProps<typeof Link>["href"];
  routeKey?: string;
};

type CountryDirectoryCountry = {
  id: string;
  flag: string;
  name: string;
  links: Record<CountryDirectoryCategory, CountryDirectoryLink[]>;
};

function buildFlightDirectoryHref(origin: string, destination: string) {
  return { pathname: "/flights/results", query: { origin, destination } } satisfies ComponentProps<typeof Link>["href"];
}

function buildCarsDirectoryHref(pickup: string) {
  return { pathname: "/cars/results", query: { pickup } } satisfies ComponentProps<typeof Link>["href"];
}

function buildHotelDirectoryHref(destination: HomepageHotelCountryCard | string) {
  const baseDate = new Date();
  const checkIn = addDaysToIsoDate(baseDate, 21);
  const checkOut = addDaysToIsoDate(baseDate, 24);
  const searchValue = typeof destination === "string" ? destination : destination.searchValue;

  return {
    pathname: "/hotels/results",
    query: { destination: searchValue, checkIn, checkOut, guests: "2", rooms: "1" },
  } satisfies ComponentProps<typeof Link>["href"];
}

const countryDirectoryCountries: CountryDirectoryCountry[] = [
  {
    id: "united-states",
    flag: "🇺🇸",
    name: "United States",
    links: {
      Flights: [
        { label: "New York to Los Angeles", href: buildFlightDirectoryHref("JFK", "LAX"), routeKey: "JFK-LAX" },
        { label: "Chicago to Miami", href: buildFlightDirectoryHref("ORD", "MIA"), routeKey: "ORD-MIA" },
        { label: "Seattle to Honolulu", href: buildFlightDirectoryHref("SEA", "HNL"), routeKey: "SEA-HNL" },
      ],
      Hotels: [
        { label: "New York stays", href: buildHotelDirectoryHref("New York") },
        { label: "Las Vegas stays", href: buildHotelDirectoryHref("Las Vegas") },
        { label: "Miami stays", href: buildHotelDirectoryHref("Miami") },
      ],
      Cars: [
        { label: "Los Angeles car hire", href: buildCarsDirectoryHref("Los Angeles") },
        { label: "Orlando car hire", href: buildCarsDirectoryHref("Orlando") },
        { label: "Denver car hire", href: buildCarsDirectoryHref("Denver") },
      ],
    },
  },
  { id: "uk", flag: "🇬🇧", name: "UK", links: { Flights: [{ label: "London to Amsterdam", href: buildFlightDirectoryHref("LHR", "AMS"), routeKey: "LHR-AMS" }, { label: "Manchester to Faro", href: buildFlightDirectoryHref("MAN", "FAO"), routeKey: "MAN-FAO" }], Hotels: [{ label: "London stays", href: buildHotelDirectoryHref("London") }, { label: "Edinburgh stays", href: buildHotelDirectoryHref("Edinburgh") }], Cars: [{ label: "London car hire", href: buildCarsDirectoryHref("London") }, { label: "Manchester car hire", href: buildCarsDirectoryHref("Manchester") }] } },
  { id: "france", flag: "🇫🇷", name: "France", links: { Flights: [{ label: "Paris to Rome", href: buildFlightDirectoryHref("CDG", "FCO"), routeKey: "CDG-FCO" }, { label: "Paris to Dubai", href: buildFlightDirectoryHref("CDG", "DXB"), routeKey: "CDG-DXB" }], Hotels: [{ label: "Paris stays", href: buildHotelDirectoryHref("Paris") }, { label: "Nice stays", href: buildHotelDirectoryHref("Nice") }], Cars: [{ label: "Paris car hire", href: buildCarsDirectoryHref("Paris") }, { label: "Nice car hire", href: buildCarsDirectoryHref("Nice") }] } },
  { id: "uae", flag: "🇦🇪", name: "UAE", links: { Flights: [{ label: "Dubai to Bangkok", href: buildFlightDirectoryHref("DXB", "BKK"), routeKey: "DXB-BKK" }, { label: "Abu Dhabi to London", href: buildFlightDirectoryHref("AUH", "LHR"), routeKey: "AUH-LHR" }], Hotels: [{ label: "Dubai stays", href: buildHotelDirectoryHref("Dubai") }, { label: "Abu Dhabi stays", href: buildHotelDirectoryHref("Abu Dhabi") }], Cars: [{ label: "Dubai car hire", href: buildCarsDirectoryHref("Dubai") }, { label: "Abu Dhabi car hire", href: buildCarsDirectoryHref("Abu Dhabi") }] } },
  { id: "japan", flag: "🇯🇵", name: "Japan", links: { Flights: [{ label: "Tokyo to Singapore", href: buildFlightDirectoryHref("HND", "SIN"), routeKey: "HND-SIN" }, { label: "Tokyo to Bangkok", href: buildFlightDirectoryHref("NRT", "BKK"), routeKey: "NRT-BKK" }], Hotels: [{ label: "Tokyo stays", href: buildHotelDirectoryHref("Tokyo") }, { label: "Osaka stays", href: buildHotelDirectoryHref("Osaka") }], Cars: [{ label: "Tokyo car hire", href: buildCarsDirectoryHref("Tokyo") }, { label: "Osaka car hire", href: buildCarsDirectoryHref("Osaka") }] } },
  { id: "mexico", flag: "🇲🇽", name: "Mexico", links: { Flights: [{ label: "Los Angeles to Mexico City", href: buildFlightDirectoryHref("LAX", "MEX"), routeKey: "LAX-MEX" }, { label: "New York to Cancún", href: buildFlightDirectoryHref("JFK", "CUN"), routeKey: "JFK-CUN" }], Hotels: [{ label: "Cancún stays", href: buildHotelDirectoryHref("Cancún") }, { label: "Mexico City stays", href: buildHotelDirectoryHref("Mexico City") }], Cars: [{ label: "Cancún car hire", href: buildCarsDirectoryHref("Cancún") }, { label: "Mexico City car hire", href: buildCarsDirectoryHref("Mexico City") }] } },
  { id: "italy", flag: "🇮🇹", name: "Italy", links: { Flights: [{ label: "Rome to Paris", href: buildFlightDirectoryHref("FCO", "CDG"), routeKey: "FCO-CDG" }, { label: "Milan to London", href: buildFlightDirectoryHref("MXP", "LHR"), routeKey: "MXP-LHR" }], Hotels: [{ label: "Rome stays", href: buildHotelDirectoryHref("Rome") }, { label: "Venice stays", href: buildHotelDirectoryHref("Venice") }], Cars: [{ label: "Rome car hire", href: buildCarsDirectoryHref("Rome") }, { label: "Milan car hire", href: buildCarsDirectoryHref("Milan") }] } },
  { id: "singapore", flag: "🇸🇬", name: "Singapore", links: { Flights: [{ label: "Singapore to Bali", href: buildFlightDirectoryHref("SIN", "DPS"), routeKey: "SIN-DPS" }, { label: "Singapore to Tokyo", href: buildFlightDirectoryHref("SIN", "HND"), routeKey: "SIN-HND" }], Hotels: [{ label: "Singapore stays", href: buildHotelDirectoryHref("Singapore") }, { label: "Sentosa stays", href: buildHotelDirectoryHref("Sentosa") }], Cars: [{ label: "Singapore car hire", href: buildCarsDirectoryHref("Singapore") }, { label: "Changi car hire", href: buildCarsDirectoryHref("Changi") }] } },
];

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
      <rect x="17" y="23" width="12" height="3" rx="1.5" fill="#004BB8" />
      <rect x="17" y="29" width="16" height="2" rx="1" fill="#D8E7F8" />
      <rect x="29" y="25" width="23" height="18" rx="5" fill="#F8FAFC" />
      <rect x="34" y="30" width="10" height="3" rx="1.5" fill="#0D9488" />
      <rect x="34" y="36" width="13" height="2" rx="1" fill="#99F6E4" />
      <circle cx="29" cy="34" r="11" fill="#F2F7FA" fillOpacity="0.78" />
      <circle cx="29" cy="34" r="8" stroke="#021C2B" strokeWidth="3" />
      <path
        d="M35 40L43 48"
        stroke="#021C2B"
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
        <linearGradient
          id="compareTile"
          x1="6"
          y1="5"
          x2="58"
          y2="59"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F2F7FA" />
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
      <rect x="24" y="21" width="17" height="3" rx="1.5" fill="#5CB6B2" />
      <rect x="24" y="29" width="12" height="2.5" rx="1.25" fill="#CFEAE8" />
      <rect x="24" y="36" width="15" height="2.5" rx="1.25" fill="#CFEAE8" />
      <circle cx="43" cy="41" r="9" fill="#CCFBF1" />
      <path
        d="M39.5 41.5L42 44L47 38.5"
        stroke="#0F766E"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="20" r="5" fill="#FDE68A" />
      <path
        d="M18 17.6V22.4"
        stroke="#A16207"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient
          id="pricingTile"
          x1="5"
          y1="5"
          x2="59"
          y2="59"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F2F7FA" />
          <stop offset="1" stopColor="#EAF7F6" />
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
      <rect x="34" y="21" width="11" height="3" rx="1.5" fill="#004BB8" />
      <rect x="34" y="28" width="14" height="2" rx="1" fill="#D8E7F8" />
      <path
        d="M15 20L29 15L43 20V31C43 41.5 36 47.5 29 50C22 47.5 15 41.5 15 31V20Z"
        fill="#F2F7FA"
        stroke="#021C2B"
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
        stroke="#004BB8"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient
          id="handoffTile"
          x1="6"
          y1="5"
          x2="58"
          y2="59"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F2F7FA" />
          <stop offset="1" stopColor="#F0FDFA" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const POPULAR_DESTINATION_VISIBLE_CARD_COUNT = 8;
const HOME_DISCOVERY_FARE_FETCH_CARD_COUNT = 24;

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

// Production rule: the public homepage must never initiate passkey setup,
// passkey authentication, or passkey setup-state fetches. Optional account-security
// onboarding belongs on /auth/signin, /onboarding/security, /dashboard/security,
// and passkey API routes only.
export default function Home() {
  const { locale, t: dictionary } = useLocale();
  const { mode: regionCode, selectedOption } = useRegion();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterMessage, setNewsletterMessage] = useState("");
  const [newsletterStatus, setNewsletterStatus] =
    useState<NewsletterStatus>("idle");
  const [newsletterPending, setNewsletterPending] = useState(false);
  const { status: sessionStatus } = useSession();
  const [savedTripIds, setSavedTripIds] = useState<string[]>([]);
  const [backendSavedTripIds, setBackendSavedTripIds] = useState<
    Record<string, string>
  >({});
  const [savedTripError, setSavedTripError] = useState("");
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
  const [canScrollDestinationsLeft, setCanScrollDestinationsLeft] = useState(false);
  const [canScrollDestinationsRight, setCanScrollDestinationsRight] = useState(false);
  const [, setHasAdvancedWithNextArrowState] = useState(false);
  const hasAdvancedWithNextArrowRef = useRef(false);
  const programmaticDestinationScrollCleanupRef = useRef<(() => void) | null>(null);
  const [expandedCountryDirectoryId, setExpandedCountryDirectoryId] = useState(countryDirectoryCountries[0]?.id ?? "");

  const setHasAdvancedWithNextArrow = useCallback((value: boolean) => {
    hasAdvancedWithNextArrowRef.current = value;
    setHasAdvancedWithNextArrowState(value);
  }, []);

  const measureDestinationRailState = useCallback(() => {
    const rail = destinationsRailRef.current;
    if (!rail) return null;
    return getLogicalCarouselScrollState({
      scrollLeft: rail.scrollLeft,
      scrollWidth: rail.scrollWidth,
      clientWidth: rail.clientWidth,
      direction: window.getComputedStyle(rail).direction,
    });
  }, []);

  const updateDestinationArrowState = useCallback(() => {
    const state = measureDestinationRailState();
    if (!state) return null;
    if (state.isAtStart && hasAdvancedWithNextArrowRef.current) {
      setHasAdvancedWithNextArrow(false);
    }
    const arrows = getCarouselArrowRenderState(
      state,
      hasAdvancedWithNextArrowRef.current,
    );
    setCanScrollDestinationsLeft(arrows.shouldRenderPreviousArrow);
    setCanScrollDestinationsRight(arrows.canScrollToNext);
    return state;
  }, [measureDestinationRailState, setHasAdvancedWithNextArrow]);

  const scrollDestinationsRail = (direction: "left" | "right") => {
    const rail = destinationsRailRef.current;

    if (!rail) return;

    programmaticDestinationScrollCleanupRef.current?.();
    const beforeState = measureDestinationRailState();
    if (!beforeState) return;
    const targetLogical = getDestinationRailTargetLogicalScroll(
      rail,
      beforeState.logicalScrollLeft,
      direction,
    );
    const directionStyle = window.getComputedStyle(rail).direction;
    const targetIsStart = targetLogical <= 2;

    const finalizeProgrammaticScroll = () => {
      const finalState = measureDestinationRailState();
      if (!finalState) return;

      if (direction === "right" && finalState.logicalScrollLeft > beforeState.logicalScrollLeft + 2) {
        setHasAdvancedWithNextArrow(true);
      }

      if (targetIsStart && finalState.logicalScrollLeft <= 2) {
        rail.scrollTo({
          left: getCarouselStartScrollLeft(directionStyle, finalState.maxScrollLeft),
          behavior: "instant",
        });
        setHasAdvancedWithNextArrow(false);
        setCanScrollDestinationsLeft(false);
        setCanScrollDestinationsRight(finalState.maxScrollLeft > 2);
        return;
      }

      updateDestinationArrowState();
    };

    rail.scrollTo({
      left: getPhysicalScrollLeftForLogicalTarget(
        targetLogical,
        beforeState.maxScrollLeft,
        directionStyle,
        rail.scrollLeft,
      ),
      behavior: "smooth",
    });

    programmaticDestinationScrollCleanupRef.current = observeProgrammaticCarouselScroll(
      rail,
      measureDestinationRailState,
      finalizeProgrammaticScroll,
    );
  };

  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const translateDiscoveryItemCopy = (
    item: HomeDiscoveryCardItem,
    field: "title" | "routeNote",
  ) => translateHomeDiscoveryField(dictionary, item, field);
  const homepageHeroImage = useMemo(
    () => getHomepageHeroImageForMarket(regionCode),
    [regionCode],
  );

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

  const curatedDiscoveryItems = useMemo(
    () => getHomeDiscoveryImageCardsByRegion(regionCode),
    [regionCode],
  );
  const discoveryFareCardsById = useMemo(() => {
    const cardsById = new Map<string, HomeDiscoveryFareCard>();

    for (const card of discoveryFareCardState.cards) {
      cardsById.set(card.item.id, card);
    }

    return cardsById;
  }, [discoveryFareCardState.cards]);
  const discoveryCards = useMemo<HomeDiscoveryFareCard[]>(
    () =>
      curatedDiscoveryItems.map((item) => {
        const fareCard = discoveryFareCardsById.get(item.id);

        return {
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
          fare: fareCard?.fare,
          priceState: fareCard?.priceState ?? "none",
        };
      }),
    [curatedDiscoveryItems, discoveryFareCardsById],
  );
  const desktopDiscoveryCards = useMemo(
    () => discoveryCards.slice(0, HOME_DISCOVERY_IMAGE_CARD_COUNT),
    [discoveryCards],
  );
  const mobileDiscoveryCards = useMemo(
    () => discoveryCards.slice(0, HOME_DISCOVERY_IMAGE_CARD_COUNT),
    [discoveryCards],
  );
  const topRowDiscoveryCards = useMemo(
    () => mobileDiscoveryCards.filter((_, index) => index % 2 === 0),
    [mobileDiscoveryCards],
  );
  const bottomRowDiscoveryCards = useMemo(
    () => mobileDiscoveryCards.filter((_, index) => index % 2 === 1),
    [mobileDiscoveryCards],
  );
  const regionalRouteItems = useMemo(
    () => getHomepageRegionalRouteCards(regionCode, curatedDiscoveryItems),
    [curatedDiscoveryItems, regionCode],
  );
  const fareCardsByExactRoute = useMemo(() => {
    const cardsByRoute = new Map<string, HomeDiscoveryFareCard>();

    for (const card of discoveryFareCardState.cards) {
      const routeKey = getRouteKey(card.item.originCode, card.item.destinationCode);
      if (routeKey && !cardsByRoute.has(routeKey)) cardsByRoute.set(routeKey, card);
    }

    return cardsByRoute;
  }, [discoveryFareCardState.cards]);

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

  const refreshBackendSavedTrips = useCallback(async (signal?: AbortSignal) => {
    const result = await fetchBackendSavedTrips(signal);
    if (!result.ok || !result.items) return;

    const backendIds: Record<string, string> = {};
    const localIds = result.items.map((item) => {
      const localId = getSavedTripLocalId(item);
      backendIds[localId] = item.id;
      return localId;
    });

    setBackendSavedTripIds(backendIds);
    setSavedTripIds(localIds);
  }, []);

  useEffect(() => {
    if (sessionStatus === "loading") return;

    if (sessionStatus === "authenticated") {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => {
        void refreshBackendSavedTrips(controller.signal);
      }, 0);
      return () => {
        window.clearTimeout(timeoutId);
        controller.abort();
      };
    }

    const timeoutId = window.setTimeout(() => {
      setBackendSavedTripIds({});
      setSavedTripIds(readSavedTripIds());
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [refreshBackendSavedTrips, sessionStatus]);

  useEffect(() => {
    const rail = destinationsRailRef.current;
    if (!rail) return;

    const measure = () => updateDestinationArrowState();
    const resetToStart = () => {
      const maxScrollLeft = Math.max(0, rail.scrollWidth - rail.clientWidth);
      const direction = window.getComputedStyle(rail).direction;
      rail.scrollTo({
        left: getCarouselStartScrollLeft(direction, maxScrollLeft),
        behavior: "instant",
      });
      setHasAdvancedWithNextArrow(false);
      setCanScrollDestinationsLeft(false);
      measure();
    };

    setCanScrollDestinationsLeft(false);
    const firstFrame = window.requestAnimationFrame(() => {
      resetToStart();
      window.requestAnimationFrame(measure);
    });

    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(measure);
    });
    resizeObserver.observe(rail);
    rail.addEventListener("scroll", measure, { passive: true });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      programmaticDestinationScrollCleanupRef.current?.();
      programmaticDestinationScrollCleanupRef.current = null;
      resizeObserver.disconnect();
      rail.removeEventListener("scroll", measure);
    };
  }, [measureDestinationRailState, popularDestinationMarket, visiblePopularDestinations, setHasAdvancedWithNextArrow, updateDestinationArrowState]);

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
            limit: HOME_DISCOVERY_FARE_FETCH_CARD_COUNT,
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


  const handleSavedTripToggle = async (
    event: React.MouseEvent<HTMLButtonElement>,
    itemId: string,
    display?: SavedTripDisplayDetails,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (sessionStatus !== "authenticated") {
      setSavedTripError("");
      setSavedTripIds((current) => {
        const next = toggleSavedTripId(current, itemId);
        writeSavedTripIds(next);
        return next;
      });
      return;
    }

    if (savedTripIds.includes(itemId)) {
      const backendId = backendSavedTripIds[itemId];
      if (!backendId) {
        await refreshBackendSavedTrips();
        return;
      }

      const result = await deleteBackendTrip(backendId);
      if (result.ok) {
        setSavedTripError("");
        setSavedTripIds((current) => current.filter((id) => id !== itemId));
        setBackendSavedTripIds((current) => {
          const next = { ...current };
          delete next[itemId];
          return next;
        });
      } else {
        setSavedTripError(
          result.error ?? "Unable to update saved trips right now.",
        );
        await refreshBackendSavedTrips();
      }
      return;
    }

    const result = await saveBackendTrip(itemId, display);
    if (result.ok || result.duplicate) {
      setSavedTripError("");
      await refreshBackendSavedTrips();
    } else {
      setSavedTripError(result.error ?? "Unable to save trip right now.");
    }
  };

  return (
    <>
      <AppHeader hideMobileSecondaryNavLinks />

      <main className="flex-1 bg-white">
        <section className="relative min-h-[420px] overflow-visible bg-slate-950 sm:min-h-[550px] lg:min-h-[610px]">
          <div className="absolute inset-0">
            <Image
              src={homepageHeroImage.url}
              alt={t("homeHeroImageAlt")}
              fill
              priority
              sizes="100vw"
              className="object-cover object-[62%_center] sm:object-[60%_center] lg:object-[58%_48%]"
            />
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-[88%] bg-gradient-to-r from-slate-950/68 via-slate-950/28 to-transparent rtl:left-auto rtl:right-0 rtl:bg-gradient-to-l sm:w-[72%] lg:w-[62%]" />
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

        <section className="border-y border-slate-200/75 bg-[#fbfaf7] pb-7 pt-[25rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:border-y-0 sm:bg-transparent sm:pb-5 sm:pt-24 sm:shadow-none lg:pt-28">
          <div className="mx-auto h-px w-[calc(100%-2rem)] max-w-[1280px] bg-slate-200/80 sm:hidden" />
          <div className="page-shell pt-5 sm:pt-0">
            <div className="flex items-center">
              <h2 className="text-xl font-bold tracking-normal text-slate-900 sm:text-2xl">
                {t("homePopularDestinations")}
              </h2>
            </div>

            <div className="relative mt-6">
              {canScrollDestinationsLeft ? (
                <button
                  type="button"
                  aria-label={t("homePreviousDestinations")}
                  onClick={() => scrollDestinationsRail("left")}
                  className="focus-ring absolute -left-2 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-slate-600 shadow-[0_16px_30px_-20px_rgba(15,23,42,0.65)] transition hover:bg-white hover:text-slate-900 sm:flex"
                >
                  <ChevronLeft size={18} />
                </button>
              ) : null}

              {canScrollDestinationsRight ? (
                <button
                  type="button"
                  aria-label={t("homeNextDestinations")}
                  onClick={() => scrollDestinationsRail("right")}
                  className="focus-ring absolute -right-2 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-slate-600 shadow-[0_16px_30px_-20px_rgba(15,23,42,0.65)] transition hover:bg-white hover:text-slate-900 sm:flex"
                >
                  <ChevronRight size={18} />
                </button>
              ) : null}

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
                        city: destination.city,
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
          <p className="sr-only" aria-live="polite">
            {savedTripError}
          </p>
          <div className="space-y-3 sm:space-y-5">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                {t("homeDiscoveryTitle")}
              </h2>
              <p className="text-sm font-normal leading-6 text-slate-600 sm:text-base">
                {t("homeDiscoverySubtitle")}
              </p>
            </div>
            <div className="space-y-3 sm:hidden">
              {[topRowDiscoveryCards, bottomRowDiscoveryCards].map(
                (rowCards, rowIndex) => (
                  <div
                    key={rowIndex === 0 ? "top-row" : "bottom-row"}
                    className={`-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
                      rowIndex === 0 ? "pb-1" : "pb-2"
                    }`}
                  >
                    <div className="flex w-max gap-3 pr-10">
                      {rowCards.map((card) => {
                        return (
                          <div
                            key={card.item.id}
                            className="w-[44vw] min-w-[170px] max-w-[210px] shrink-0"
                          >
                            <DiscoverySuggestionCard
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
                              title={translateDiscoveryItemCopy(
                                card.item,
                                "title",
                              )}
                              originCode={card.item.originCode}
                              destinationCodeLabel={card.item.destinationCode}
                              routeNote={translateDiscoveryItemCopy(
                                card.item,
                                "routeNote",
                              )}
                              compact
                              mobileBoardCard
                              price={card.fare}
                              displayCurrency={selectedOption.currency}
                              expectedOriginCode={card.item.originCode}
                              expectedDestinationCode={card.item.destinationCode}
                              isPriceLoading={discoveryFareCardState.loading}
                              isSaved={savedTripIds.includes(card.item.id)}
                              onHeartToggle={handleSavedTripToggle}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ),
              )}
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


        <section className="page-shell mt-4 sm:mt-6">
          <div className="border-y border-slate-300/80 bg-gradient-to-b from-slate-50/90 via-[#F2F7FA]/45 to-slate-50/80 py-5 sm:py-7">
            <div className="px-0">
            <div className="space-y-4">
              <div className="max-w-3xl space-y-1.5">
                <h2 className="text-xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-2xl">
                  {t("homeTrustTitle")}
                </h2>
                <p className="text-sm font-medium leading-6 text-slate-700 sm:text-base">
                  {t("homeTrustSubtitle")}
                </p>
              </div>

              <div className="mt-3 divide-y divide-slate-200/70 md:grid md:grid-cols-3 md:gap-6 md:divide-y-0 md:[&>article+article]:border-l md:[&>article+article]:border-slate-200/70 md:[&>article+article]:pl-6 md:rtl:[&>article+article]:border-l-0 md:rtl:[&>article+article]:border-r md:rtl:[&>article+article]:pl-0 md:rtl:[&>article+article]:pr-6">
                <article className="flex items-start gap-3 py-2.5 first:pt-1 last:pb-1 md:px-2 md:py-1.5">
                  <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-[#004BB8]/10">
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

                <article className="flex items-start gap-3 py-2.5 first:pt-1 last:pb-1 md:px-2 md:py-1.5">
                  <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-[#5CB6B2]/18">
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

                <article className="flex items-start gap-3 py-2.5 first:pt-1 last:pb-1 md:px-2 md:py-1.5">
                  <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-[#021C2B]/10">
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
          </div>
        </section>


        <section className="page-shell bg-white pb-8 pt-8 sm:bg-transparent sm:pb-9 sm:pt-11" aria-labelledby="regional-routes-heading">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 id="regional-routes-heading" className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
              {t("homeRegionalRoutesTitle") || "Discover destinations from your region"}
            </h2>
            <Link href="/flights" className="focus-ring hidden items-center gap-1.5 rounded-full px-2 py-1 text-sm font-bold text-[#004BB8] hover:text-[#021C2B] sm:inline-flex">
              {t("homeRegionalRoutesViewAll") || "View all route ideas"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
            <div className="flex snap-x snap-mandatory gap-4 sm:grid sm:grid-cols-5 sm:gap-5">
              {regionalRouteItems.map((item) => {
                const fareCard = fareCardsByExactRoute.get(getRouteKey(item.originCode, item.destinationCode) ?? "");

                return (
                  <RegionalRouteCard
                    key={`regional-${item.id}`}
                    href={buildDiscoveryCardHref(fareCard?.fare, {
                      originCode: item.originCode,
                      destinationCode: item.destinationCode,
                      displayCurrency: selectedOption.currency,
                      market: regionCode,
                    })}
                    originCity={item.originCity}
                    destinationCity={item.destinationCity}
                    image={item.image}
                    imageAlt={item.imageAlt}
                    destinationCode={item.destinationCode}
                  />
                );
              })}
            </div>
          </div>
        </section>

        <section className="page-shell grid gap-5 py-9 lg:grid-cols-2">
          <PromoPanel
            tone="blue"
            title={t("homePromoFlightsTitle")}
            body={t("homePromoFlightsBody")}
            cta={t("homePromoFlightsCta")}
            href="/deals"
            icon={<Plane size={74} />}
          />

          <PromoPanel
            tone="teal"
            title={t("homePromoHotelsTitle")}
            body={t("homePromoHotelsBody")}
            cta={t("homePromoHotelsCta")}
            href="/hotels/results"
            icon={<Hotel size={74} />}
          />
        </section>

        <section className="page-shell pb-7 pt-2 sm:pb-8 sm:pt-3" aria-labelledby="homepage-country-directory-heading">
          <div className="mb-4 max-w-3xl space-y-2 sm:mb-5">
            <h2 id="homepage-country-directory-heading" className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
              {t("homeHotelDestinationsTitle")}
            </h2>
            <p className="text-sm font-medium leading-6 text-slate-700 sm:text-base">
              {t("homeHotelDestinationsSubtitle")}
            </p>
          </div>

          <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_24px_70px_-42px_rgba(2,28,43,0.5)]">
            {countryDirectoryCountries.map((country) => {
              const isExpanded = expandedCountryDirectoryId === country.id;

              return (
                <article key={country.id} className="border-b border-slate-200 last:border-b-0">
                  <button
                    type="button"
                    className="focus-ring flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-[#F2F7FA]/70 sm:px-6"
                    aria-expanded={isExpanded}
                    aria-controls={`country-directory-${country.id}`}
                    onClick={() => setExpandedCountryDirectoryId((current) => current === country.id ? "" : country.id)}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="text-3xl leading-none" aria-hidden="true">{country.flag}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-base font-bold text-slate-950 sm:text-lg">{country.name}</span>
                        <span className="mt-0.5 block text-[0.68rem] font-extrabold uppercase tracking-[0.22em] text-[#004BB8]">CARS · FLIGHTS · HOTELS</span>
                      </span>
                    </span>
                    <ChevronRight className={`h-5 w-5 shrink-0 text-slate-500 transition ${isExpanded ? "rotate-90" : ""}`} aria-hidden="true" />
                  </button>

                  {isExpanded ? (
                    <div id={`country-directory-${country.id}`} className="grid gap-4 bg-[#F8FBFC] px-4 pb-5 pt-1 sm:grid-cols-3 sm:px-6 sm:pb-6">
                      {(["Flights", "Hotels", "Cars"] as const).map((category) => (
                        <div key={`${country.id}-${category}`} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/75">
                          <h3 className="text-sm font-extrabold uppercase tracking-[0.16em] text-slate-500">{category}</h3>
                          <div className="mt-3 space-y-2.5">
                            {country.links[category].map((link) => {
                              const fareCard = link.routeKey ? fareCardsByExactRoute.get(link.routeKey) : undefined;
                              const displayPrice = fareCard && hasFreshProviderPrice(fareCard.fare, {
                                originCode: fareCard.item.originCode,
                                destinationCode: fareCard.item.destinationCode,
                              })
                                ? formatDisplayPrice({ amount: fareCard.fare.price, sourceCurrency: fareCard.fare.currency, displayCurrency: selectedOption.currency }).formatted
                                : "";

                              return (
                                <Link key={link.label} href={link.href} className="focus-ring group flex items-center justify-between gap-3 rounded-xl px-2 py-2 text-sm font-semibold text-slate-800 transition hover:bg-[#F2F7FA] hover:text-[#004BB8]">
                                  <span>{link.label}</span>
                                  <span className="flex shrink-0 items-center gap-1 text-xs font-extrabold text-[#004BB8]">
                                    {displayPrice ? <span>{displayPrice}</span> : null}
                                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden="true" />
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        <section className="page-shell pb-5 pt-1 sm:pb-7 sm:pt-2">
          <div className="overflow-hidden rounded-2xl bg-[#062B63] px-5 py-4 text-white shadow-[0_22px_50px_-30px_rgba(2,28,43,0.7)] sm:rounded-3xl sm:px-7 sm:py-5 lg:grid lg:grid-cols-[150px_minmax(0,1fr)_minmax(360px,0.9fr)] lg:items-center lg:gap-6">
            <div className="mx-auto mb-3 h-16 w-36 text-white/90 lg:mb-0 lg:mx-0" aria-hidden="true">
              <svg viewBox="0 0 180 90" fill="none" className="h-full w-full">
                <path d="M2 62C32 36 46 87 68 55C84 31 103 40 121 22" stroke="white" strokeOpacity="0.62" strokeWidth="2" strokeDasharray="6 7" strokeLinecap="round" />
                <path d="M83 36L160 8L132 76L116 49L83 36Z" fill="#EAF7FF" />
                <path d="M116 49L160 8L102 43" stroke="#94DFF0" strokeWidth="3" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="text-center lg:text-start">
              <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">{t("homeNewsletterTitle")}</h2>
              <p className="mt-1.5 text-sm font-medium leading-6 text-white/82">{t("homeNewsletterBody")}</p>
            </div>
            <div className="mt-4 lg:mt-0">
              <form className="flex flex-col gap-2 sm:flex-row sm:gap-0" onSubmit={handleNewsletterSubmit} aria-busy={newsletterPending}>
                <input type="email" value={newsletterEmail} onChange={(event) => { setNewsletterEmail(event.target.value); if (newsletterStatus !== "idle") { setNewsletterStatus("idle"); setNewsletterMessage(""); } }} placeholder={t("homeNewsletterPlaceholder")} className="focus-ring h-12 min-w-0 flex-1 rounded-xl border-0 bg-white px-4 text-base font-semibold text-slate-950 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 sm:rounded-e-none" aria-label={t("homeEmailAddress")} disabled={newsletterPending} required />
                <button type="submit" className="focus-ring h-12 shrink-0 rounded-xl bg-[#5CB6B2] px-5 text-sm font-extrabold text-white transition hover:bg-[#48a5a1] disabled:cursor-not-allowed disabled:bg-slate-500 sm:rounded-s-none" aria-busy={newsletterPending} disabled={newsletterPending}>{newsletterPending ? t("homeSubscribing") : t("homeSubscribe")}</button>
              </form>
              <p className="mt-1.5 text-xs font-medium leading-5 text-white/72">{t("homeNewsletterConsent")}</p>
              {newsletterMessage ? <p className={`mt-1.5 text-xs font-semibold ${newsletterStatus === "error" ? "text-red-200" : "text-teal-100"}`} role="status" aria-live="polite">{newsletterMessage}</p> : null}
            </div>
          </div>
        </section>



      </main>

      <Footer />
    </>
  );
}


function observeProgrammaticCarouselScroll(
  rail: HTMLDivElement,
  measure: () => ReturnType<typeof getLogicalCarouselScrollState> | null,
  onSettled: () => void,
) {
  let rafId = 0;
  let fallbackId = 0;
  let lastLogicalPosition: number | null = null;
  let stableFrameCount = 0;
  let cleanedUp = false;
  const settleTolerance = 0.5;
  const requiredStableFrames = 2;

  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    window.cancelAnimationFrame(rafId);
    window.clearTimeout(fallbackId);
    rail.removeEventListener("scroll", onScrollActivity);
    rail.removeEventListener("scrollend", settleNow);
  };

  const settleNow = () => {
    if (cleanedUp) return;
    cleanup();
    onSettled();
  };

  const checkForSettledPosition = () => {
    if (cleanedUp) return;
    const state = measure();
    if (!state) {
      settleNow();
      return;
    }

    if (
      lastLogicalPosition !== null &&
      Math.abs(state.logicalScrollLeft - lastLogicalPosition) <= settleTolerance
    ) {
      stableFrameCount += 1;
    } else {
      stableFrameCount = 0;
    }

    lastLogicalPosition = state.logicalScrollLeft;

    if (stableFrameCount >= requiredStableFrames) {
      settleNow();
      return;
    }

    rafId = window.requestAnimationFrame(checkForSettledPosition);
  };

  function onScrollActivity() {
    stableFrameCount = 0;
  }

  rail.addEventListener("scroll", onScrollActivity, { passive: true });
  rail.addEventListener("scrollend", settleNow, { passive: true });
  rafId = window.requestAnimationFrame(checkForSettledPosition);
  fallbackId = window.setTimeout(settleNow, 1200);

  return cleanup;
}

function getDestinationRailTargetLogicalScroll(
  rail: HTMLDivElement,
  currentLogicalScrollLeft: number,
  direction: "left" | "right",
) {
  const state = getLogicalCarouselScrollState({
    scrollLeft: rail.scrollLeft,
    scrollWidth: rail.scrollWidth,
    clientWidth: rail.clientWidth,
    direction: window.getComputedStyle(rail).direction,
  });
  const tolerance = 2;
  const childStarts = Array.from(rail.children)
    .map((child) => (child instanceof HTMLElement ? child.offsetLeft - rail.offsetLeft : null))
    .filter((value): value is number => typeof value === "number")
    .map((value) => Math.min(state.maxScrollLeft, Math.max(0, value)))
    .sort((first, second) => first - second);

  if (direction === "right") {
    return (
      childStarts.find((start) => start > currentLogicalScrollLeft + tolerance) ??
      state.maxScrollLeft
    );
  }

  return (
    [...childStarts]
      .reverse()
      .find((start) => start < currentLogicalScrollLeft - tolerance) ?? 0
  );
}

function getPhysicalScrollLeftForLogicalTarget(
  logicalTarget: number,
  maxScrollLeft: number,
  direction: string,
  currentScrollLeft: number,
) {
  const target = Math.min(maxScrollLeft, Math.max(0, logicalTarget));
  if (direction !== "rtl") return target;

  return currentScrollLeft < 0 ? -target : maxScrollLeft - target;
}

function RegionalRouteCard({
  href,
  originCity,
  destinationCity,
  image,
  imageAlt,
  destinationCode,
}: {
  href: ComponentProps<typeof Link>["href"];
  originCity: string;
  destinationCity: string;
  image: string;
  imageAlt: string;
  destinationCode: string;
}) {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const routeLabel = `${originCity} → ${destinationCity}`;

  return (
    <Link
      href={href}
      aria-label={`${originCity} to ${destinationCity} flight search.`}
      className="focus-ring group relative flex aspect-[4/3] w-[min(78vw,250px)] shrink-0 snap-start overflow-hidden rounded-2xl bg-slate-900 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.72)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_44px_-24px_rgba(15,23,42,0.78)] sm:w-auto sm:min-w-0"
    >
      <DiscoveryCardImage
        image={image}
        imageAlt={imageAlt}
        destinationCode={destinationCode}
        destinationFallbackLabel={t("destinationImageFallback")}
        sizes="(min-width: 1280px) 14rem, (min-width: 640px) 20vw, 78vw"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/78 via-slate-950/34 to-transparent px-4 pb-5 pt-16">
        <p className="text-base font-semibold leading-5 text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)]">
          {routeLabel}
        </p>
      </div>
    </Link>
  );
}



function DiscoveryCardImage({
  image,
  imageAlt,
  destinationCode,
  destinationFallbackLabel,
  sizes = "(min-width: 1280px) 7rem, (min-width: 640px) 6.5rem, 5rem",
}: {
  image: string;
  imageAlt: string;
  destinationCode: string;
  destinationFallbackLabel: string;
  sizes?: string;
}) {
  const [hasError, setHasError] = useState(false);
  const hasImage = Boolean(image?.trim());

  if (!hasImage || hasError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-[#F2F7FA] via-[#EAF2FF] to-[#EAF7F6] text-slate-700">
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
      sizes={sizes}
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
  mobileBoardCard,
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
  mobileBoardCard?: boolean;
  price?: HomepageFare;
  displayCurrency: string;
  expectedOriginCode: string;
  expectedDestinationCode: string;
  isPriceLoading?: boolean;
  isSaved: boolean;
  onHeartToggle: (
    event: React.MouseEvent<HTMLButtonElement>,
    itemId: string,
    display?: SavedTripDisplayDetails,
  ) => void;
}) {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const currencyRates = useCurrencyRates();
  const hasProviderPrice = hasFreshProviderPrice(price, {
    originCode: expectedOriginCode,
    destinationCode: expectedDestinationCode,
  });
  const displayPrice =
    hasProviderPrice && typeof price?.price === "number" && price.currency
      ? formatDisplayPrice({
          amount: price.price,
          sourceCurrency: price.currency,
          displayCurrency,
          convertUsdEstimate: true,
          maximumFractionDigits: 0,
          rates: currencyRates.rates,
          isFallbackRate: currencyRates.isFallback,
        })
      : null;
  const tripSummary = `${t("oneWay")} · ${t("economy")} · ${t("homeDiscoveryTravelerCountOne")}`;

  return (
    <Link
      href={href}
      aria-label={`${title}. ${originCode} to ${destinationCodeLabel}.${displayPrice ? ` ${t("fromPrice")} ${displayPrice.formatted}.` : ""}`}
      className={`group relative flex min-w-0 flex-col overflow-hidden border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-slate-300 active:-translate-y-0.5 ${mobileBoardCard ? "h-[300px] rounded-2xl border-slate-200/80 shadow-[0_18px_35px_-24px_rgba(15,23,42,0.72)] hover:shadow-[0_24px_42px_-24px_rgba(15,23,42,0.72)]" : "rounded-xl shadow-[0_16px_30px_-22px_rgba(15,23,42,0.52)] hover:shadow-[0_24px_36px_-20px_rgba(15,23,42,0.6)]"}`}
    >
      <button
        type="button"
        onClick={(event) =>
          onHeartToggle(event, itemId, {
            title,
            route: `${originCode} → ${destinationCodeLabel}`,
            note: routeNote,
            originCode,
            destinationCode: destinationCodeLabel,
            image,
            imageAlt,
            href,
            search: {
              tripType: "one-way",
              cabinClass: "economy",
              travelerCount: 1,
              currency: displayCurrency,
              price: price?.price,
            },
          })
        }
        aria-label={
          isSaved ? t("homeRemoveFromSavedRoutes") : t("homeSaveRoute")
        }
        aria-pressed={isSaved}
        className={`focus-ring absolute right-3 top-3 rtl:left-3 rtl:right-auto z-10 flex h-8 w-8 items-center justify-center rounded-full border shadow-sm backdrop-blur-sm transition ${isSaved ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100" : "border-white/80 bg-white/90 text-slate-500 hover:border-slate-200 hover:text-slate-800"}`}
      >
        <Heart size={15} className={isSaved ? "fill-current" : ""} />
      </button>

      <div
        className={`relative w-full shrink-0 overflow-hidden ${mobileBoardCard ? "h-[135px]" : compact ? "h-[148px]" : "h-[196px] md:h-[150px] lg:h-[154px]"}`}
      >
        <DiscoveryCardImage
          image={image}
          imageAlt={imageAlt}
          destinationCode={destinationCode}
          destinationFallbackLabel={t("destinationImageFallback")}
        />
      </div>

      <div
        className={`min-w-0 flex-1 bg-white ${mobileBoardCard ? "flex flex-col px-3 pb-3 pt-3" : compact ? "space-y-2 px-2.5 py-3" : "space-y-2 px-3 py-3"}`}
      >
        <p
          className={`line-clamp-2 break-words text-slate-950 ${mobileBoardCard ? "text-sm font-semibold leading-[1.28] tracking-[-0.01em]" : compact ? "pr-10 rtl:pl-10 rtl:pr-0 text-sm font-semibold leading-[1.32]" : "pr-10 rtl:pl-10 rtl:pr-0 text-sm font-semibold leading-[1.35] md:text-[0.95rem]"}`}
        >
          {title}
        </p>
        <p className="text-xs font-semibold leading-5 text-slate-700">
          {originCode} → {destinationCodeLabel}
        </p>
        <p
          className={`font-semibold uppercase leading-4 tracking-[0.08em] text-slate-500 ${compact ? "text-[10px]" : "text-[10px] md:text-[11px]"}`}
        >
          {tripSummary}
        </p>
        {isPriceLoading ? (
          <span className="mt-auto block h-8 w-16 animate-pulse rounded bg-slate-200" aria-label={t("homeCheckingProviderRoutePricing")} />
        ) : (
          <div className="mt-auto flex items-baseline gap-1.5 pt-2">
            <span className="text-sm font-semibold leading-5 text-slate-700">{t("fromPrice")}</span>
            {displayPrice ? (
              <span className="text-base font-bold leading-5 tracking-tight text-slate-950" title={displayPrice.title}>{displayPrice.formatted}</span>
            ) : null}
          </div>
        )}
      </div>
    </Link>
  );
}

function buildDestinationCardHref(
  price: HomepageFare | undefined,
  options: {
    city: string;
    originCode: string;
    destinationCode: string;
    displayCurrency: string;
    market: string;
  },
): ComponentProps<typeof Link>["href"] {
  void price;
  void options.originCode;
  void options.destinationCode;
  void options.displayCurrency;
  void options.market;

  return {
    pathname: "/hotels/results",
    query: {
      destination: options.city,
    },
  };
}

function getRouteKey(originCode: string, destinationCode: string) {
  const origin = originCode.trim().toUpperCase();
  const destination = destinationCode.trim().toUpperCase();

  return /^[A-Z]{3}$/.test(origin) && /^[A-Z]{3}$/.test(destination) && origin !== destination
    ? `${origin}-${destination}`
    : null;
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
    display?: SavedTripDisplayDetails,
  ) => void;
}) {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const [imageSource, setImageSource] = useState(image);

  return (
    <article className="group min-w-[17.25rem] flex-[0_0_17.25rem] snap-start overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_14px_32px_-24px_rgba(15,23,42,0.65)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_45px_-26px_rgba(15,23,42,0.75)] sm:min-w-[20.5rem] sm:flex-[0_0_20.5rem]">
      <Link href={href} className="focus-ring block">
        <div className="relative h-72 sm:h-80">
          <Image
            src={imageSource}
            alt={imageAlt}
            fill
            quality={92}
            sizes="(min-width: 1280px) 20.5rem, (min-width: 640px) 20.5rem, 17.25rem"
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
            className={`focus-ring absolute right-3 top-3 rtl:left-3 rtl:right-auto z-0 flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur transition duration-200 ${
              isSaved
                ? "border-rose-200/90 bg-rose-500/90 text-white shadow-sm shadow-rose-900/20 hover:bg-rose-500"
                : "border-white/30 bg-white/20 text-white hover:bg-white/30"
            }`}
            aria-label={saveLabelTemplate.replace("{{city}}", city)}
            aria-pressed={isSaved}
            onClick={(event) =>
              onHeartToggle(event, destinationId, {
                title: city,
                route: `${originCode} → ${destinationCode}`,
                note: country,
                originCode,
                destinationCode,
                destinationCity: city,
                image,
                imageAlt,
                href,
                search: {
                  tripType: "one-way",
                  cabinClass: "economy",
                  travelerCount: 1,
                  currency: displayCurrency,
                  price: price?.price,
                },
              })
            }
          >
            <Heart size={17} className={isSaved ? "fill-current" : ""} />
          </button>

          <div className="absolute bottom-4 left-4 z-10 pr-4 rtl:left-auto rtl:right-4 rtl:pl-4 rtl:pr-0 text-white [text-shadow:0_2px_12px_rgba(15,23,42,0.55)]">
            <h3 className="text-xl font-black tracking-tight sm:text-2xl">
              {city}
            </h3>
            <p className="text-sm font-semibold text-white/95">{country}</p>
          </div>
        </div>

        <div className="flex min-h-[4.5rem] items-end px-4 pb-4 pt-3">
          <DestinationPricePill
            price={price}
            displayCurrency={displayCurrency}
            expectedOriginCode={originCode}
            expectedDestinationCode={destinationCode}
            isLoading={isPriceLoading}
            ctaLabel={t("homeExploreFares")}
            suppressPrice
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
  ctaLabel,
  suppressPrice,
}: {
  price?: DestinationPrice;
  displayCurrency: string;
  expectedOriginCode?: string;
  expectedDestinationCode?: string;
  isLoading: boolean;
  ctaLabel?: string;
  suppressPrice?: boolean;
}) {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const currencyRates = useCurrencyRates();
  const hasProviderPrice = hasFreshProviderPrice(price, {
    originCode: expectedOriginCode,
    destinationCode: expectedDestinationCode,
  });

  const fallbackCtaLabel = ctaLabel ?? t("homeExploreFares");

  if (suppressPrice) {
    return (
      <span className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-[15px] font-bold text-slate-800 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.8)]">
        {fallbackCtaLabel}
      </span>
    );
  }

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
        {fallbackCtaLabel}
      </span>
    );
  }

  const amount = price.price;
  const currency = price.currency;

  if (typeof amount !== "number" || !Number.isFinite(amount) || !currency) {
    return (
      <span className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-[15px] font-bold text-slate-800 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.8)]">
        {fallbackCtaLabel}
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
  tone: "blue" | "teal";
  title: string;
  body: string;
  cta: string;
  href: string;
  icon: ReactNode;
}) {
  const isBlue = tone === "blue";

  return (
    <article
      className={`relative min-h-56 overflow-hidden rounded-xl p-8 ${
        isBlue ? "bg-[#EAF2FF]" : "bg-[#EAF7F6]"
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
          className="mt-5 bg-[#004BB8] font-semibold hover:bg-[#021C2B]"
        >
          {cta}
          <ArrowRight size={16} />
        </LinkButton>
      </div>

      <div
        className={`absolute bottom-5 right-6 flex h-40 w-40 items-center justify-center rounded-full ${
          isBlue
            ? "bg-white/55 text-[#004BB8]"
            : "bg-white/70 text-[#004BB8]"
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
