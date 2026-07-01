"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight, ExternalLink, Heart, Trash2, X } from "lucide-react";

import { PriceText } from "@/components/currency/PriceText";
import { useLocale } from "@/components/layout/LocaleProvider";

import {
  clearRecentSearches,
  readRecentSearches,
  removeRecentSearch,
  type RecentFlightParams,
  type RecentHotelParams,
  type RecentSearchEntry,
} from "@/lib/recent-searches";
import { translations as enTranslations } from "@/lib/i18n/en";
import {
  translateHomeDiscoveryCity,
  translateHomeDiscoveryCopy,
} from "@/lib/i18n/homeDiscovery";
import { readSavedTripIds, writeSavedTripIds } from "@/lib/saved-trips-local";
import {
  deleteBackendTrip,
  fetchBackendSavedTrips,
  getSavedTripLocalId,
  type SavedTripApiItem,
} from "@/lib/saved-trips-api";
import {
  getHomeDiscoveryByRegion,
  homeDiscoveryByRegion,
  type HomeDiscoveryItem,
} from "@/data/homeDiscovery";

type ResolvedSavedTrip = {
  id: string;
  title: string;
  route: string;
  note: string;
  image?: string;
  imageAlt?: string;
  originCode?: string;
  destinationCode?: string;
  href: ComponentProps<typeof Link>["href"];
  unresolved: boolean;
};

type SavedTripFareSearch = {
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

type SavedTripFare = {
  id: string;
  code: string;
  price?: number;
  currency?: string;
  providerBacked: boolean;
  searchedAt?: string;
  expiresAt?: string;
  search?: SavedTripFareSearch;
  unavailable?: boolean;
};

type ProviderBackedSavedTripFare = SavedTripFare & {
  price: number;
  currency: string;
  search: SavedTripFareSearch;
  expiresAt: string;
};

const allDiscoveryItems = [
  ...Object.values(homeDiscoveryByRegion).flat(),
  ...getHomeDiscoveryByRegion(),
];

const discoveryById = new Map<string, HomeDiscoveryItem>(
  allDiscoveryItems.map((item) => [item.id, item]),
);

const resolveSavedTrip = (
  id: string,
  dictionary: Record<string, string>,
): ResolvedSavedTrip => {
  const matched = discoveryById.get(id);

  if (!matched) {
    return {
      id,
      title:
        dictionary.savedTripFallbackTitle ??
        enTranslations.savedTripFallbackTitle,
      route:
        dictionary.savedTripFallbackRoute ??
        enTranslations.savedTripFallbackRoute,
      note:
        dictionary.savedTripFallbackNote ??
        enTranslations.savedTripFallbackNote,
      href: "/destinations",
      unresolved: true,
    };
  }

  return {
    id,
    title: translateHomeDiscoveryCopy(dictionary, matched).title,
    route: `${translateHomeDiscoveryCity(dictionary, matched.originCity)} (${matched.originCode}) → ${translateHomeDiscoveryCity(dictionary, matched.destinationCity)} (${matched.destinationCode})`,
    note: translateHomeDiscoveryCopy(dictionary, matched).routeNote,
    image: matched.image,
    imageAlt: matched.imageAlt,
    originCode: matched.originCode,
    destinationCode: matched.destinationCode,
    href: "/flights",
    unresolved: false,
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const getPayloadString = (payload: Record<string, unknown>, key: string) => {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value : undefined;
};

const getPayloadHref = (
  payload: Record<string, unknown>,
): ComponentProps<typeof Link>["href"] | undefined => {
  const href = payload.href;
  if (typeof href === "string" && href.trim()) return href;
  if (!isRecord(href)) return undefined;

  const pathname = getPayloadString(href, "pathname");
  if (!pathname) return undefined;

  const query = isRecord(href.query)
    ? Object.fromEntries(
        Object.entries(href.query).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      )
    : undefined;

  return query ? { pathname, query } : { pathname };
};

const resolveSavedTripFromBackendPayload = (
  item: SavedTripApiItem,
  dictionary: Record<string, string>,
): ResolvedSavedTrip => {
  const localId = getSavedTripLocalId(item);
  const discoveryTrip = resolveSavedTrip(localId, dictionary);
  if (!discoveryTrip.unresolved) return discoveryTrip;

  if (!isRecord(item.payload)) return discoveryTrip;

  const originCode = getPayloadString(item.payload, "originCode");
  const destinationCode = getPayloadString(item.payload, "destinationCode");
  const title = getPayloadString(item.payload, "title");
  const route =
    getPayloadString(item.payload, "route") ??
    (originCode && destinationCode
      ? `${originCode} → ${destinationCode}`
      : undefined);
  const note = getPayloadString(item.payload, "note");

  if (!title || !route || !note) return discoveryTrip;

  return {
    id: localId,
    title,
    route,
    note,
    image: getPayloadString(item.payload, "image"),
    imageAlt: getPayloadString(item.payload, "imageAlt") ?? title,
    originCode,
    destinationCode,
    href: getPayloadHref(item.payload) ?? "/flights",
    unresolved: false,
  };
};

const getSavedTripsDateLocale = (locale: string) => {
  const normalizedLocale = locale.toLowerCase();

  if (normalizedLocale.startsWith("de")) return "de-DE";
  if (normalizedLocale.startsWith("ar")) return "ar";
  if (normalizedLocale.startsWith("fr")) return "fr-FR";
  if (normalizedLocale.startsWith("es")) return "es-ES";
  if (normalizedLocale.startsWith("it")) return "it-IT";
  if (normalizedLocale.startsWith("hi")) return "hi-IN";
  if (normalizedLocale.startsWith("nl")) return "nl-NL";
  if (normalizedLocale.startsWith("tr")) return "tr-TR";
  if (normalizedLocale.startsWith("th")) return "th-TH";
  if (normalizedLocale === "pt-br" || normalizedLocale.startsWith("pt")) {
    return "pt-BR";
  }
  if (normalizedLocale === "zh-cn" || normalizedLocale.startsWith("zh")) {
    return "zh-CN";
  }
  if (normalizedLocale === "ja" || normalizedLocale.startsWith("ja")) {
    return "ja-JP";
  }
  if (normalizedLocale === "ko" || normalizedLocale.startsWith("ko")) {
    return "ko-KR";
  }

  return "en-US";
};

const parseDateValue = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value,
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDutchShortMonth = (formattedDate: string, locale: string) => {
  if (!locale.toLowerCase().startsWith("nl")) return formattedDate;

  return formattedDate.replace(/\b([a-z]{3})(?=\s|$)/i, (month) =>
    month.endsWith(".") ? month : `${month}.`,
  );
};

const formatRecentDate = (
  value: string | undefined,
  formatter: Intl.DateTimeFormat,
  fallback: string,
  locale: string,
) => {
  if (!value) return fallback;
  const parsed = parseDateValue(value);
  return parsed
    ? formatDutchShortMonth(formatter.format(parsed), locale)
    : value;
};

const isFlightParams = (
  params: RecentSearchEntry["params"],
): params is RecentFlightParams => "origin" in params && "cabinClass" in params;

const isHotelParams = (
  params: RecentSearchEntry["params"],
): params is RecentHotelParams => "guests" in params && "rooms" in params;

const cabinTranslationKeyByValue: Record<string, string> = {
  economy: "savedTripsCabinEconomy",
  "premium economy": "savedTripsCabinPremiumEconomy",
  business: "savedTripsCabinBusiness",
  first: "savedTripsCabinFirst",
};

const normalizeDestinationKey = (value: string) =>
  value.normalize("NFKD").replace(/\p{M}/gu, "").trim().toLowerCase();

const SAVED_TRIP_CARD_IMAGE_SIZES =
  "(min-width: 1280px) 25vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 100vw";
const EAGER_SAVED_TRIP_IMAGE_COUNT = 3;
const OPTIMIZED_REMOTE_IMAGE_HOSTS = new Set([
  "images.unsplash.com",
  "images.pexels.com",
]);

function getCardImageOptimizationMode(src: string) {
  if (src.startsWith("/")) return { supported: true, optimized: true };

  try {
    const url = new URL(src);
    const supported = url.protocol === "http:" || url.protocol === "https:";
    return {
      supported,
      optimized:
        url.protocol === "https:" &&
        OPTIMIZED_REMOTE_IMAGE_HOSTS.has(url.hostname),
    };
  } catch {
    return { supported: false, optimized: false };
  }
}

type SavedCardImageProps = {
  src: string;
  alt: string;
  priority?: boolean;
  hoverScaleClassName?: string;
  heightClassName?: string;
};

function SavedCardImage({
  src,
  alt,
  priority = false,
  hoverScaleClassName = "group-hover:scale-[1.03]",
  heightClassName = "h-[196px] md:h-[190px] lg:h-[198px]",
}: SavedCardImageProps) {
  const imageMode = getCardImageOptimizationMode(src);
  const imageClassName = `object-cover transition duration-500 ${hoverScaleClassName}`;

  return (
    <div
      className={`relative w-full shrink-0 overflow-hidden ${heightClassName}`}
    >
      {imageMode.supported ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={SAVED_TRIP_CARD_IMAGE_SIZES}
          className={imageClassName}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          unoptimized={!imageMode.optimized}
        />
      ) : null}
    </div>
  );
}

const genericTravelFallback =
  allDiscoveryItems.find(
    (item) => normalizeDestinationKey(item.destinationCity) === "dubai",
  ) ??
  allDiscoveryItems.find(
    (item) => normalizeDestinationKey(item.destinationCity) === "london",
  ) ??
  allDiscoveryItems.find((item) => Boolean(item.image));

function SavedEmptyStateIllustration() {
  return (
    <div
      className="relative mx-auto h-48 w-full max-w-[24rem] overflow-hidden sm:h-52"
      aria-hidden="true"
    >
      <div className="absolute start-1/2 top-5 h-36 w-36 -translate-x-1/2 rounded-full bg-teal/10" />
      <div className="absolute bottom-4 start-1/2 h-8 w-[19rem] -translate-x-1/2 rounded-[100%] bg-navy/5 blur-sm" />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 384 208"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M72 66c34-24 64-29 90-15 26 13 31 42 59 49 25 6 43-12 72-7"
          stroke="currentColor"
          className="text-blue/30"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="8 12"
        />
        <path d="M48 80l118-34 8 96-118 34-8-96Z" className="fill-white" />
        <path
          d="M166 46l78 28 8 96-78-28-8-96Z"
          className="fill-surface-muted"
        />
        <path d="M244 74l92-28 8 96-92 28-8-96Z" className="fill-white" />
        <path
          d="M48 80l118-34 78 28 92-28 8 96-92 28-78-28-118 34-8-96Z"
          stroke="currentColor"
          className="text-navy/20"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M132 57l9 97M213 63l9 96M278 64l8 96"
          stroke="currentColor"
          className="text-navy/10"
          strokeWidth="3"
        />
        <path
          d="M108 116c18-21 49-27 74-13 21 11 29 33 50 39 16 4 31-2 46-15"
          stroke="currentColor"
          className="text-teal"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="1 11"
        />
        <g className="drop-shadow-sm">
          <path
            d="M117 54c-18 0-33 14-33 32 0 26 33 59 33 59s33-33 33-59c0-18-15-32-33-32Z"
            className="fill-teal"
          />
          <path
            d="M117 99c7-5 18-14 18-24 0-7-5-12-12-12-3 0-5 1-6 3-2-2-4-3-7-3-7 0-12 5-12 12 0 10 12 19 19 24Z"
            className="fill-white"
          />
        </g>
        <g className="drop-shadow-sm">
          <rect
            x="237"
            y="34"
            width="54"
            height="68"
            rx="16"
            className="fill-navy"
          />
          <path d="M252 34h24v37l-12-7-12 7V34Z" className="fill-blue" />
          <path
            d="M254 81h21"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
            opacity=".75"
          />
        </g>
        <path
          d="M290 108l35 10-22 9-6 21-13-31-24-9 30 0Z"
          className="fill-blue"
        />
        <path
          d="M290 108l35 10-22 9-6 21-13-31-24-9 30 0Z"
          stroke="white"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

const findFlightDiscoveryImage = (entry: RecentSearchEntry) => {
  const params = entry.params as { origin?: string; destination?: string };
  const origin = params.origin?.trim().toUpperCase() ?? "";
  const destination = params.destination?.trim().toUpperCase() ?? "";
  const labelKey = normalizeDestinationKey(entry.label);

  const byDestinationCode = allDiscoveryItems.find(
    (item) => item.destinationCode === destination,
  );
  if (byDestinationCode) return byDestinationCode;

  const byRoute = allDiscoveryItems.find(
    (item) =>
      item.originCode === origin && item.destinationCode === destination,
  );
  if (byRoute) return byRoute;

  return allDiscoveryItems.find((item) => {
    const destinationCity = normalizeDestinationKey(item.destinationCity);
    const title = normalizeDestinationKey(item.title);
    return labelKey.includes(destinationCity) || title.includes(labelKey);
  });
};

const findHotelDiscoveryImage = (entry: RecentSearchEntry) => {
  const params = entry.params as { destination?: string };
  const destinationKey = normalizeDestinationKey(
    params.destination ?? entry.label,
  );
  return allDiscoveryItems.find((item) => {
    const city = normalizeDestinationKey(item.destinationCity);
    const title = normalizeDestinationKey(item.title);
    return (
      destinationKey === city ||
      destinationKey.includes(city) ||
      title.includes(destinationKey)
    );
  });
};

const resolveRecentSearchImage = (entry: RecentSearchEntry) => {
  if (entry.image) {
    return {
      image: entry.image,
      imageAlt: entry.imageAlt ?? entry.label,
    };
  }

  if (entry.type === "flight") {
    const match = findFlightDiscoveryImage(entry);
    if (match) {
      return { image: match.image, imageAlt: match.imageAlt };
    }
  }

  if (entry.type === "hotel") {
    const match = findHotelDiscoveryImage(entry);
    if (match) {
      return { image: match.image, imageAlt: match.imageAlt };
    }
  }

  if (genericTravelFallback?.image) {
    return {
      image: genericTravelFallback.image,
      imageAlt: genericTravelFallback.imageAlt ?? "Travel destination",
    };
  }

  return null;
};

function hasFreshProviderFare(
  fare: SavedTripFare | undefined,
  trip: ResolvedSavedTrip,
): fare is ProviderBackedSavedTripFare {
  const search = fare?.search;

  if (
    fare?.providerBacked !== true ||
    typeof fare.price !== "number" ||
    !Number.isFinite(fare.price) ||
    !fare.currency ||
    !search ||
    !fare.expiresAt ||
    !trip.originCode ||
    !trip.destinationCode
  ) {
    return false;
  }

  if (
    search.tripType !== "one-way" ||
    search.origin !== trip.originCode ||
    search.destination !== trip.destinationCode ||
    search.currency !== fare.currency ||
    search.travelers !== 1 ||
    search.adults !== 1 ||
    search.children !== 0 ||
    search.infants !== 0 ||
    search.cabinClass !== "economy" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(search.departureDate)
  ) {
    return false;
  }

  const expiresAtMs = Date.parse(fare.expiresAt);
  return Number.isFinite(expiresAtMs) && expiresAtMs > Date.now();
}

function buildSavedTripHref(trip: ResolvedSavedTrip, fare?: SavedTripFare) {
  const search = hasFreshProviderFare(fare, trip) ? fare.search : undefined;

  if (!search) return trip.href;

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

export function SavedTripsAndRecentSearches() {
  const { locale, t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const dateLocale = getSavedTripsDateLocale(locale);
  const shortDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(dateLocale, {
        month: "short",
        day: "numeric",
      }),
    [dateLocale],
  );
  const searchedDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(dateLocale, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    [dateLocale],
  );
  const { status: sessionStatus } = useSession();
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [backendSavedTripIds, setBackendSavedTripIds] = useState<
    Record<string, string>
  >({});
  const [backendSavedTrips, setBackendSavedTrips] = useState<
    SavedTripApiItem[]
  >([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearchEntry[]>([]);
  const [savedTripFares, setSavedTripFares] = useState<
    Record<string, SavedTripFare>
  >({});

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
    setBackendSavedTrips(result.items);
    setSavedIds(localIds);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setRecentSearches(readRecentSearches());
    }, 0);

    return () => window.clearTimeout(id);
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
      setBackendSavedTrips([]);
      setSavedIds(readSavedTripIds());
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [refreshBackendSavedTrips, sessionStatus]);

  const savedTrips = useMemo(
    () =>
      sessionStatus === "authenticated"
        ? backendSavedTrips.map((item) =>
            resolveSavedTripFromBackendPayload(item, dictionary),
          )
        : savedIds.map((id) => resolveSavedTrip(id, dictionary)),
    [backendSavedTrips, dictionary, savedIds, sessionStatus],
  );

  useEffect(() => {
    const pricedRoutes = savedTrips
      .filter((trip) => trip.originCode && trip.destinationCode)
      .map((trip) => ({
        id: trip.id,
        originCode: trip.originCode,
        destinationCode: trip.destinationCode,
      }));

    if (!pricedRoutes.length) return;

    const controller = new AbortController();

    async function fetchSavedTripFares() {
      try {
        const response = await fetch("/api/flights/destination-prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destinations: pricedRoutes,
            currency: "USD",
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Saved trip fares unavailable");
        }

        const payload = (await response.json()) as {
          prices?: SavedTripFare[];
        };
        const fares = Object.fromEntries(
          (payload.prices ?? []).map((fare) => [fare.id, fare]),
        );

        setSavedTripFares(fares);
      } catch {
        if (controller.signal.aborted) return;
        setSavedTripFares({});
      }
    }

    void fetchSavedTripFares();

    return () => controller.abort();
  }, [savedTrips]);

  const handleUnsaveTrip = async (id: string) => {
    if (sessionStatus !== "authenticated") {
      const nextIds = savedIds.filter((tripId) => tripId !== id);
      writeSavedTripIds(nextIds);
      setSavedIds(nextIds);
      return;
    }

    const backendId = backendSavedTripIds[id];
    if (!backendId) {
      await refreshBackendSavedTrips();
      return;
    }

    const result = await deleteBackendTrip(backendId);
    if (result.ok) {
      setSavedIds((current) => current.filter((tripId) => tripId !== id));
      setBackendSavedTrips((current) =>
        current.filter((item) => item.id !== backendId),
      );
      setBackendSavedTripIds((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    } else {
      await refreshBackendSavedTrips();
    }
  };

  const handleClearSaved = async () => {
    if (sessionStatus !== "authenticated") {
      writeSavedTripIds([]);
      setSavedIds([]);
      return;
    }

    const entries = Object.entries(backendSavedTripIds);
    const results = await Promise.all(
      entries.map(([, backendId]) => deleteBackendTrip(backendId)),
    );
    if (results.every((result) => result.ok)) {
      setSavedIds([]);
      setBackendSavedTripIds({});
      setBackendSavedTrips([]);
    } else {
      await refreshBackendSavedTrips();
    }
  };

  const handleRemoveRecent = (id: string) => {
    setRecentSearches(removeRecentSearch(id));
  };

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  const formatTravelerCount = (count: number) =>
    count === 1
      ? t("savedTripsTravelerCountOne")
      : t("savedTripsTravelerCountOther").replace("{{count}}", String(count));

  const formatGuestCount = (count: number) =>
    count === 1
      ? t("savedTripsGuestCountOne")
      : t("savedTripsGuestCountOther").replace("{{count}}", String(count));

  const formatRoomCount = (count: number) =>
    count === 1
      ? t("savedTripsRoomCountOne")
      : t("savedTripsRoomCountOther").replace("{{count}}", String(count));

  const formatCabinClass = (value: string) => {
    const key = cabinTranslationKeyByValue[value.trim().toLowerCase()];
    return key ? t(key) : value;
  };

  const formatRecentSearchSubtitle = (entry: RecentSearchEntry) => {
    if (entry.type === "flight" && isFlightParams(entry.params)) {
      const outbound = formatRecentDate(
        entry.params.departureDate,
        shortDateFormatter,
        entry.params.departureDate,
        locale,
      );
      const inbound = entry.params.returnDate
        ? formatRecentDate(
            entry.params.returnDate,
            shortDateFormatter,
            entry.params.returnDate,
            locale,
          )
        : t("savedTripsRecentOneWay");

      return `${outbound}${entry.params.returnDate ? ` – ${inbound}` : ""} · ${formatTravelerCount(entry.params.travelers)} · ${formatCabinClass(entry.params.cabinClass)}`;
    }

    if (entry.type === "hotel" && isHotelParams(entry.params)) {
      const checkIn = formatRecentDate(
        entry.params.checkIn,
        shortDateFormatter,
        entry.params.checkIn,
        locale,
      );
      const checkOut = formatRecentDate(
        entry.params.checkOut,
        shortDateFormatter,
        entry.params.checkOut,
        locale,
      );

      return `${checkIn} – ${checkOut} · ${formatGuestCount(entry.params.guests)} · ${formatRoomCount(entry.params.rooms)}`;
    }

    return entry.subtitle;
  };

  const formatSearchedLabel = (value?: string) =>
    t("savedTripsSearchedDate").replace(
      "{{date}}",
      formatRecentDate(value, searchedDateFormatter, "", locale),
    );

  return (
    <div className="px-4 pb-8 pt-6 sm:px-6 sm:pb-10 sm:pt-10 lg:px-8 lg:pb-11 lg:pt-12">
      <div className="mx-auto min-w-0 max-w-[88rem] space-y-8 text-start">
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1
                id="saved-dashboard-title"
                className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]"
              >
                {t("savedTripsPageTitle")} ❤️
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                {t("savedTripsPageSubtitle")}
              </p>
            </div>

            {savedTrips.length > 0 ? (
              <button
                type="button"
                onClick={handleClearSaved}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-rose-200 hover:text-rose-700"
              >
                <Trash2 className="h-4 w-4" />
                {t("savedTripsClearAllSaved")}
              </button>
            ) : null}
          </div>

          {savedTrips.length === 0 ? (
            <div className="flex min-h-[22rem] items-start justify-center px-3 pb-10 pt-6 sm:min-h-[32rem] sm:pt-14 lg:min-h-[34rem] lg:pt-16">
              <div className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[1.6rem]">
                  {t("savedTripsEmptyTitle")}
                </h2>
                <div className="mt-2 w-full sm:mt-6">
                  <SavedEmptyStateIllustration />
                </div>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600 sm:mt-4">
                  {t("savedTripsEmptyDescription")}
                </p>
                <Link
                  href="/"
                  className="mt-6 inline-flex min-h-11 w-auto min-w-[8rem] items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-8 py-2 text-sm font-semibold text-white shadow-[0_18px_36px_-24px_rgba(37,99,235,0.9)] transition hover:bg-blue-700 sm:mt-4"
                >
                  {t("savedTripsExploreDestinations")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
              {savedTrips.map((trip, index) => {
                const fare = savedTripFares[trip.id];
                const hasProviderFare = hasFreshProviderFare(fare, trip);
                const tripHref = buildSavedTripHref(trip, fare);

                return (
                  <article
                    key={trip.id}
                    className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-transparent shadow-[0_16px_30px_-22px_rgba(15,23,42,0.52)] transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_24px_36px_-20px_rgba(15,23,42,0.6)] active:-translate-y-0.5"
                  >
                    <button
                      type="button"
                      onClick={() => handleUnsaveTrip(trip.id)}
                      aria-label={t("savedTripsRemoveSavedTrip")}
                      aria-pressed
                      className="focus-ring absolute end-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 shadow-sm backdrop-blur-sm transition hover:bg-rose-100"
                    >
                      <Heart size={15} className="fill-current" />
                    </button>

                    {trip.image ? (
                      <SavedCardImage
                        src={trip.image}
                        alt={trip.imageAlt ?? trip.title}
                        priority={index < EAGER_SAVED_TRIP_IMAGE_COUNT}
                        heightClassName="h-40 sm:h-44 md:h-[190px] lg:h-[198px]"
                      />
                    ) : (
                      <div className="flex h-40 w-full shrink-0 items-center justify-center bg-gradient-to-br from-violet-100 via-fuchsia-50 to-cyan-50 text-sm font-semibold uppercase tracking-[0.14em] text-slate-600 sm:h-44 md:h-[190px] lg:h-[198px]">
                        {t("savedTripFallbackTitle")}
                      </div>
                    )}

                    <div className="flex min-w-0 flex-1 flex-col bg-white">
                      <div className="min-w-0 flex-1 space-y-1.5 px-3 pt-2.5 sm:space-y-2 sm:pt-3">
                        <h3 className="line-clamp-2 break-words pe-10 text-sm font-bold leading-[1.35] text-slate-950 md:text-[0.95rem]">
                          {trip.title}
                        </h3>
                        <p className="line-clamp-2 break-words text-xs font-medium leading-5 text-slate-600 md:text-sm">
                          {trip.route}
                        </p>
                        <p className="line-clamp-2 break-words text-xs font-medium leading-5 text-slate-600 md:text-sm">
                          {trip.note}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          <span className="rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-violet-700">
                            {trip.unresolved
                              ? t("savedTripsSavedBadge")
                              : t("savedTripsTrendingBadge")}
                          </span>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                            {t("homeDiscoveryTripOneWay")} ·{" "}
                            {t("homeDiscoveryCabinEconomy")} ·{" "}
                            {t("homeDiscoveryTravelerCountOne")}
                          </p>
                        </div>
                      </div>

                      <div className="mt-auto border-t border-slate-200/90 px-3 pb-3 pt-2.5 sm:pt-3">
                        <div className="flex flex-col items-stretch gap-2">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                              {hasProviderFare
                                ? t("savedTripsProviderFare")
                                : t("savedTripsCurrentOptions")}
                            </p>
                            <p className="text-sm font-semibold leading-tight text-slate-950 md:text-base">
                              {hasProviderFare ? (
                                <PriceText
                                  amountUsd={fare.price}
                                  sourceAmount={fare.price}
                                  sourceCurrency={fare.currency}
                                />
                              ) : (
                                t("savedTripsCompareCurrentOptions")
                              )}
                            </p>
                          </div>
                          <Link
                            href={tripHref}
                            className="inline-flex min-h-9 items-center justify-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-center text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-900"
                          >
                            {hasProviderFare
                              ? t("savedTripsViewFare")
                              : t("savedTripsSearchRoute")}
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {recentSearches.length > 0 ? (
          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                  {t("savedTripsRecentSearchesTitle")} 🕘
                </h2>
                <p className="mt-1 text-sm font-normal leading-6 text-slate-600">
                  {t("savedTripsRecentSearchesSubtitle")}
                </p>
              </div>

              <button
                type="button"
                onClick={handleClearRecent}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700"
              >
                <Trash2 className="h-4 w-4" />
                {t("savedTripsClearAllRecent")}
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {recentSearches.map((entry) => {
                const visual = resolveRecentSearchImage(entry);
                return (
                  <article
                    key={entry.id}
                    className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                  >
                    <button
                      type="button"
                      aria-label={t("savedTripsRemoveRecentSearch")}
                      onClick={() => handleRemoveRecent(entry.id)}
                      className="focus-ring absolute end-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                    >
                      <X className="h-4 w-4" />
                    </button>

                    {visual?.image ? (
                      <SavedCardImage
                        src={visual.image}
                        alt={visual.imageAlt}
                        hoverScaleClassName="group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-36 w-full items-center justify-center bg-gradient-to-br from-slate-100 via-indigo-50 to-cyan-100 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 sm:h-40">
                        {entry.type === "flight"
                          ? t("savedTripsFlightSearchFallback")
                          : t("savedTripsHotelSearchFallback")}
                      </div>
                    )}

                    <div className="space-y-2.5 p-4">
                      <span className="inline-flex rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                        {entry.type === "flight"
                          ? t("savedTripsTypeFlight")
                          : t("savedTripsTypeHotel")}
                      </span>

                      <h3 className="pe-12 text-lg font-semibold leading-tight tracking-tight text-slate-900">
                        {entry.label}
                      </h3>
                      <p className="line-clamp-2 text-sm leading-5 text-slate-600">
                        {formatRecentSearchSubtitle(entry)}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">
                          {formatSearchedLabel(entry.createdAt)}
                        </span>
                      </div>
                      <div className="mt-1 border-t border-slate-200/90 pt-2.5">
                        <Link
                          href={entry.href}
                          className="inline-flex min-h-11 items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-900"
                        >
                          {t("savedTripsRepeatSearch")}
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
