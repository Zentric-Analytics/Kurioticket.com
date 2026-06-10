"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ExternalLink,
  Heart,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { PriceText } from "@/components/currency/PriceText";
import { useLocale } from "@/components/layout/LocaleProvider";

import {
  clearRecentSearches,
  readRecentSearches,
  removeRecentSearch,
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
      title: dictionary.savedTripFallbackTitle ?? enTranslations.savedTripFallbackTitle ?? "Saved trip",
      route: dictionary.savedTripFallbackRoute ?? enTranslations.savedTripFallbackRoute ?? "Destination details unavailable",
      note: dictionary.savedTripFallbackNote ?? enTranslations.savedTripFallbackNote ?? "This trip was saved on this device and can still be removed anytime.",
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

const formatDate = (value?: string) => {
  if (!value) return "Flexible dates";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
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

  return (
    <div className="page-shell">
      <div className="space-y-8 pb-2 md:space-y-10">
        <section className="space-y-4 md:space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                Saved trips ❤️
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Your handpicked itineraries and trending routes.
              </p>
            </div>

            {savedTrips.length > 0 ? (
              <button
                type="button"
                onClick={handleClearSaved}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-rose-200 hover:text-rose-700"
              >
                <Trash2 className="h-4 w-4" />
                Clear all saved
              </button>
            ) : null}
          </div>

          {savedTrips.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-rose-200 bg-[linear-gradient(155deg,rgba(255,241,242,0.9),rgba(255,255,255,1))] p-8 text-center md:p-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-[0_16px_30px_-20px_rgba(15,23,42,0.45)]">
                <Heart className="h-7 w-7 fill-rose-500 text-rose-500" />
              </div>
              <h3 className="mt-5 text-lg font-black tracking-tight text-slate-900">
                Save destinations you love
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                Tap the heart icon on any route to build your personal shortlist
                and keep your next adventure one click away.
              </p>
              <Link
                href="/destinations"
                className="mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Explore destinations
                <ArrowRight className="h-4 w-4" />
              </Link>
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
                    className="group relative overflow-hidden rounded-3xl border border-slate-200/85 bg-white shadow-[0_26px_55px_-40px_rgba(15,23,42,0.7)] transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_28px_64px_-34px_rgba(15,23,42,0.72)]"
                  >
                    <button
                      type="button"
                      onClick={() => handleUnsaveTrip(trip.id)}
                      aria-label="Remove from saved trips"
                      aria-pressed
                      className="focus-ring absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-rose-200/90 bg-rose-500/95 text-white shadow-sm shadow-rose-900/20 transition hover:bg-rose-500"
                    >
                      <Heart className="h-6 w-6 fill-current" />
                    </button>

                    {trip.image ? (
                      <img
                        src={trip.image}
                        alt={trip.imageAlt ?? trip.title}
                        className="h-48 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-48 w-full items-center justify-center bg-gradient-to-br from-violet-100 via-fuchsia-50 to-cyan-50 text-sm font-bold uppercase tracking-[0.14em] text-slate-600">
                        Saved trip
                      </div>
                    )}

                    <div className="space-y-3 p-5">
                      <h3 className="pr-12 text-lg font-black leading-tight tracking-tight text-slate-900">
                        {trip.title}
                      </h3>
                      <p className="line-clamp-2 text-[11px] font-semibold uppercase tracking-[0.11em] text-slate-600">
                        {trip.route}
                      </p>
                      <p className="line-clamp-2 text-sm leading-6 text-slate-600">
                        {trip.note}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <span className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-violet-700">
                          {trip.unresolved ? "Saved" : "Trending"}
                        </span>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                          {t("homeDiscoveryTripOneWay")} · {t("homeDiscoveryCabinEconomy")} ·{" "}
                          {t("homeDiscoveryTravelerCountOne")}
                        </p>
                      </div>

                      <div className="mt-1 border-t border-slate-200/90 pt-3">
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                              {hasProviderFare
                                ? "Provider fare"
                                : "Current options"}
                            </p>
                            <p className="text-base font-black leading-tight text-slate-950">
                              {hasProviderFare ? (
                                <PriceText
                                  amountUsd={fare.price}
                                  sourceAmount={fare.price}
                                  sourceCurrency={fare.currency}
                                />
                              ) : (
                                "Compare current options"
                              )}
                            </p>
                          </div>
                          <Link
                            href={tripHref}
                            className="inline-flex min-h-11 items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-900"
                          >
                            {hasProviderFare ? "View fare" : "Search route"}
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

        <section className="space-y-4 md:space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                Recent searches 🕘
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Pick up where you left off and search again in one tap.
              </p>
            </div>

            {recentSearches.length > 0 ? (
              <button
                type="button"
                onClick={handleClearRecent}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700"
              >
                <Trash2 className="h-4 w-4" />
                Clear all recent
              </button>
            ) : null}
          </div>

          {recentSearches.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-[linear-gradient(155deg,rgba(241,245,249,0.8),rgba(255,255,255,1))] p-8 text-center md:p-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-[0_16px_30px_-20px_rgba(15,23,42,0.45)]">
                <Search className="h-7 w-7 text-slate-400" />
              </div>
              <h3 className="mt-5 text-lg font-black tracking-tight text-slate-900">
                Start a search to build momentum
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                We&apos;ll keep your latest routes and stays here so planning
                feels faster every time you return.
              </p>
              <Link
                href="/"
                className="mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Search new trips
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {recentSearches.map((entry) => {
                const visual = resolveRecentSearchImage(entry);
                return (
                  <article
                    key={entry.id}
                    className="group relative overflow-hidden rounded-3xl border border-slate-200/85 bg-white shadow-[0_18px_38px_-30px_rgba(15,23,42,0.62)] transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_24px_45px_-30px_rgba(15,23,42,0.68)]"
                  >
                    <button
                      type="button"
                      aria-label="Remove recent search"
                      onClick={() => handleRemoveRecent(entry.id)}
                      className="focus-ring absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
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
                      <div className="flex h-36 w-full items-center justify-center bg-gradient-to-br from-slate-100 via-indigo-50 to-cyan-100 text-xs font-bold uppercase tracking-[0.14em] text-slate-600 sm:h-40">
                        {entry.type === "flight"
                          ? "Flight search"
                          : "Hotel search"}
                      </div>
                    )}

                    <div className="space-y-2.5 p-4">
                      <span className="inline-flex rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                        {entry.type === "flight" ? "Flight" : "Hotel"}
                      </span>

                      <h3 className="pr-12 text-lg font-black leading-tight tracking-tight text-slate-900">
                        {entry.label}
                      </h3>
                      <p className="line-clamp-2 text-sm leading-5 text-slate-600">
                        {entry.subtitle}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-600">
                          Searched {formatDate(entry.createdAt)}
                        </span>
                      </div>
                      <div className="mt-1 border-t border-slate-200/90 pt-2.5">
                        <Link
                          href={entry.href}
                          className="inline-flex min-h-11 items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-900"
                        >
                          Repeat search
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
