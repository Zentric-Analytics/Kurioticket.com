"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { translateHomeDiscoveryCopy } from "@/lib/i18n/homeDiscovery";
import { readSavedTripIds, writeSavedTripIds } from "@/lib/saved-trips-local";
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
  href: string;
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
    route: `${matched.originCity} (${matched.originCode}) → ${matched.destinationCity} (${matched.destinationCode})`,
    note: translateHomeDiscoveryCopy(dictionary, matched).routeNote,
    image: matched.image,
    imageAlt: matched.imageAlt,
    originCode: matched.originCode,
    destinationCode: matched.destinationCode,
    href: "/flights",
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
  if (normalizedLocale.startsWith("nl")) return "nl-NL";
  if (normalizedLocale === "pt-br" || normalizedLocale.startsWith("pt")) {
    return "pt-BR";
  }
  if (normalizedLocale === "zh-cn" || normalizedLocale.startsWith("zh")) {
    return "zh-CN";
  }
  if (normalizedLocale === "ja" || normalizedLocale.startsWith("ja")) {
    return "ja-JP";
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
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearchEntry[]>([]);
  const [savedTripFares, setSavedTripFares] = useState<
    Record<string, SavedTripFare>
  >({});

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSavedIds(readSavedTripIds());
      setRecentSearches(readRecentSearches());
    }, 0);

    return () => window.clearTimeout(id);
  }, []);

  const savedTrips = useMemo(
    () => savedIds.map((id) => resolveSavedTrip(id, dictionary)),
    [dictionary, savedIds],
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

  const handleUnsaveTrip = (id: string) => {
    const nextIds = savedIds.filter((tripId) => tripId !== id);
    writeSavedTripIds(nextIds);
    setSavedIds(nextIds);
  };

  const handleClearSaved = () => {
    writeSavedTripIds([]);
    setSavedIds([]);
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
      <div className="mx-auto min-w-0 max-w-[72rem] space-y-8 text-start">
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
            <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
              {savedTrips.map((trip) => {
                const fare = savedTripFares[trip.id];
                const hasProviderFare = hasFreshProviderFare(fare, trip);
                const tripHref = buildSavedTripHref(trip, fare);

                return (
                  <article
                    key={trip.id}
                    className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                  >
                    <button
                      type="button"
                      onClick={() => handleUnsaveTrip(trip.id)}
                      aria-label={t("savedTripsRemoveSavedTrip")}
                      aria-pressed
                      className="focus-ring absolute end-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-rose-200/90 bg-rose-500/95 text-white shadow-sm shadow-rose-900/20 transition hover:bg-rose-500"
                    >
                      <Heart className="h-5 w-5 fill-current" />
                    </button>

                    {trip.image ? (
                      <img
                        src={trip.image}
                        alt={trip.imageAlt ?? trip.title}
                        className="h-36 w-full object-cover transition duration-500 group-hover:scale-[1.03] sm:h-40"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-36 w-full items-center justify-center bg-gradient-to-br from-violet-100 via-fuchsia-50 to-cyan-50 text-sm font-semibold uppercase tracking-[0.14em] text-slate-600 sm:h-40">
                        {t("savedTripFallbackTitle")}
                      </div>
                    )}

                    <div className="space-y-2.5 p-4">
                      <h3 className="pe-12 text-lg font-semibold leading-tight tracking-tight text-slate-900">
                        {trip.title}
                      </h3>
                      <p className="line-clamp-2 text-[11px] font-semibold uppercase tracking-[0.11em] text-slate-600">
                        {trip.route}
                      </p>
                      <p className="line-clamp-2 text-sm leading-6 text-slate-600">
                        {trip.note}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <span className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-violet-700">
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

                      <div className="mt-1 border-t border-slate-200/90 pt-3">
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                              {hasProviderFare
                                ? t("savedTripsProviderFare")
                                : t("savedTripsCurrentOptions")}
                            </p>
                            <p className="text-base font-semibold leading-tight text-slate-950">
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
                            className="inline-flex min-h-9 items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-900"
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
                      <img
                        src={visual.image}
                        alt={visual.imageAlt}
                        className="h-36 w-full object-cover transition duration-500 group-hover:scale-[1.02] sm:h-40"
                        loading="lazy"
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
