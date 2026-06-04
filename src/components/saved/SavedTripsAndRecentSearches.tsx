"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, Heart, Search, Trash2, X } from "lucide-react";

import { PriceText } from "@/components/currency/PriceText";

import {
  clearRecentSearches,
  readRecentSearches,
  removeRecentSearch,
  type RecentSearchEntry,
} from "@/lib/recent-searches";
import {
  readSavedTripIds,
  writeSavedTripIds,
} from "@/lib/saved-trips-local";
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
  price?: number;
  href: string;
  unresolved: boolean;
};

const allDiscoveryItems = [
  ...Object.values(homeDiscoveryByRegion).flat(),
  ...getHomeDiscoveryByRegion(),
];

const discoveryById = new Map<string, HomeDiscoveryItem>(allDiscoveryItems.map((item) => [item.id, item]));

const resolveSavedTrip = (id: string): ResolvedSavedTrip => {
  const matched = discoveryById.get(id);

  if (!matched) {
    return {
      id,
      title: "Saved trip",
      route: "Destination details unavailable",
      note: "This trip was saved on this device and can still be removed anytime.",
      href: "/destinations",
      unresolved: true,
    };
  }

  return {
    id,
    title: matched.title,
    route: `${matched.originCity} (${matched.originCode}) → ${matched.destinationCity} (${matched.destinationCode})`,
    note: matched.routeNote,
    image: matched.image,
    imageAlt: matched.imageAlt,
    price: matched.priceFromUsd,
    href: `/flights/results?origin=${encodeURIComponent(matched.originCode)}&destination=${encodeURIComponent(matched.destinationCode)}`,
    unresolved: false,
  };
};

const formatDate = (value?: string) => {
  if (!value) return "Flexible dates";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const normalizeDestinationKey = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();

const genericTravelFallback =
  allDiscoveryItems.find((item) => normalizeDestinationKey(item.destinationCity) === "dubai") ??
  allDiscoveryItems.find((item) => normalizeDestinationKey(item.destinationCity) === "london") ??
  allDiscoveryItems.find((item) => Boolean(item.image));

const findFlightDiscoveryImage = (entry: RecentSearchEntry) => {
  const params = entry.params as { origin?: string; destination?: string };
  const origin = params.origin?.trim().toUpperCase() ?? "";
  const destination = params.destination?.trim().toUpperCase() ?? "";
  const labelKey = normalizeDestinationKey(entry.label);

  const byDestinationCode = allDiscoveryItems.find((item) => item.destinationCode === destination);
  if (byDestinationCode) return byDestinationCode;

  const byRoute = allDiscoveryItems.find((item) => item.originCode === origin && item.destinationCode === destination);
  if (byRoute) return byRoute;

  return allDiscoveryItems.find((item) => {
    const destinationCity = normalizeDestinationKey(item.destinationCity);
    const title = normalizeDestinationKey(item.title);
    return labelKey.includes(destinationCity) || title.includes(labelKey);
  });
};

const findHotelDiscoveryImage = (entry: RecentSearchEntry) => {
  const params = entry.params as { destination?: string };
  const destinationKey = normalizeDestinationKey(params.destination ?? entry.label);
  return allDiscoveryItems.find((item) => {
    const city = normalizeDestinationKey(item.destinationCity);
    const title = normalizeDestinationKey(item.title);
    return destinationKey === city || destinationKey.includes(city) || title.includes(destinationKey);
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

export function SavedTripsAndRecentSearches() {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearchEntry[]>([]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSavedIds(readSavedTripIds());
      setRecentSearches(readRecentSearches());
    }, 0);

    return () => window.clearTimeout(id);
  }, []);

  const savedTrips = useMemo(() => savedIds.map((id) => resolveSavedTrip(id)), [savedIds]);

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
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Saved trips ❤️</h2>
              <p className="mt-1 text-sm text-slate-600">Your handpicked itineraries and trending routes.</p>
            </div>

            {savedTrips.length > 0 ? (
              <button type="button" onClick={handleClearSaved} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-rose-200 hover:text-rose-700">
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
              <h3 className="mt-5 text-xl font-black tracking-tight text-slate-900">Save destinations you love</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                Tap the heart icon on any route to build your personal shortlist and keep your next adventure one click away.
              </p>
              <Link href="/destinations" className="mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
                Explore destinations
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
              {savedTrips.map((trip) => (
                <article key={trip.id} className="group relative overflow-hidden rounded-3xl border border-slate-200/85 bg-white shadow-[0_26px_55px_-40px_rgba(15,23,42,0.7)] transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_28px_64px_-34px_rgba(15,23,42,0.72)]">
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
                    <img src={trip.image} alt={trip.imageAlt ?? trip.title} className="h-48 w-full object-cover transition duration-500 group-hover:scale-[1.03]" loading="lazy" />
                  ) : (
                    <div className="flex h-48 w-full items-center justify-center bg-gradient-to-br from-violet-100 via-fuchsia-50 to-cyan-50 text-sm font-bold uppercase tracking-[0.14em] text-slate-600">
                      Saved trip
                    </div>
                  )}

                  <div className="space-y-3 p-5">
                    <h3 className="pr-12 text-xl font-black leading-tight tracking-tight text-slate-900">{trip.title}</h3>
                    <p className="line-clamp-2 text-[11px] font-semibold uppercase tracking-[0.11em] text-slate-600">{trip.route}</p>
                    <p className="line-clamp-2 text-sm leading-6 text-slate-600">{trip.note}</p>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <span className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-violet-700">
                        {trip.unresolved ? "Saved" : "Trending"}
                      </span>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">One way · Economy · 1 traveler</p>
                    </div>

                    <div className="mt-1 border-t border-slate-200/90 pt-3">
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">From</p>
                          <p className="text-[1.5rem] font-black leading-tight text-slate-950">{trip.price ? <PriceText amountUsd={trip.price} /> : "Price unavailable"}</p>
                        </div>
                        <Link href={trip.href} className="inline-flex min-h-11 items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-900">
                          View trip
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4 md:space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Recent searches 🕘</h2>
              <p className="mt-1 text-sm text-slate-600">Pick up where you left off and search again in one tap.</p>
            </div>

            {recentSearches.length > 0 ? (
              <button type="button" onClick={handleClearRecent} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700">
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
              <h3 className="mt-5 text-xl font-black tracking-tight text-slate-900">Start a search to build momentum</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                We&apos;ll keep your latest routes and stays here so planning feels faster every time you return.
              </p>
              <Link href="/" className="mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
                Search new trips
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {recentSearches.map((entry) => {
                const visual = resolveRecentSearchImage(entry);
                return (
                <article key={entry.id} className="group relative overflow-hidden rounded-3xl border border-slate-200/85 bg-white shadow-[0_18px_38px_-30px_rgba(15,23,42,0.62)] transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_24px_45px_-30px_rgba(15,23,42,0.68)]">
                  <button type="button" aria-label="Remove recent search" onClick={() => handleRemoveRecent(entry.id)} className="focus-ring absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900">
                    <X className="h-4 w-4" />
                  </button>

                  {visual?.image ? (
                    <img src={visual.image} alt={visual.imageAlt} className="h-36 w-full object-cover transition duration-500 group-hover:scale-[1.02] sm:h-40" loading="lazy" />
                  ) : (
                    <div className="flex h-36 w-full items-center justify-center bg-gradient-to-br from-slate-100 via-indigo-50 to-cyan-100 text-xs font-bold uppercase tracking-[0.14em] text-slate-600 sm:h-40">
                      {entry.type === "flight" ? "Flight search" : "Hotel search"}
                    </div>
                  )}

                  <div className="space-y-2.5 p-4">
                    <span className="inline-flex rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                      {entry.type === "flight" ? "Flight" : "Hotel"}
                    </span>

                    <h3 className="pr-12 text-lg font-black leading-tight tracking-tight text-slate-900">{entry.label}</h3>
                    <p className="line-clamp-2 text-sm leading-5 text-slate-600">{entry.subtitle}</p>
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-600">
                        Searched {formatDate(entry.createdAt)}
                      </span>
                    </div>
                    <div className="mt-1 border-t border-slate-200/90 pt-2.5">
                      <Link href={entry.href} className="inline-flex min-h-11 items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-900">
                        Repeat search
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              )})}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
