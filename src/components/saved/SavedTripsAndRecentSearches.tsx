"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, Heart, Search, Sparkles, Trash2, X } from "lucide-react";

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

export function SavedTripsAndRecentSearches() {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearchEntry[]>([]);

  useEffect(() => {
    setSavedIds(readSavedTripIds());
    setRecentSearches(readRecentSearches());
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
        <section className="relative overflow-hidden rounded-[2rem] border border-violet-100/80 bg-[linear-gradient(135deg,rgba(238,242,255,0.95)_0%,rgba(251,244,255,0.94)_42%,rgba(255,255,255,0.96)_100%)] p-6 shadow-[0_30px_65px_-50px_rgba(15,23,42,0.55)] md:p-10">
          <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-violet-200/45 blur-3xl" aria-hidden />
          <div className="absolute -bottom-20 left-0 h-44 w-44 rounded-full bg-cyan-100/60 blur-3xl" aria-hidden />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-white/85 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-violet-700">
              <Sparkles className="h-3.5 w-3.5" />
              Travel shortlist
            </div>

            <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl md:text-[2.8rem] md:leading-[1.05]">
              Saved trips & recent searches, always ready for your next getaway.
            </h1>

            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-700 sm:text-base">
              Keep your best ideas in one beautiful place. Revisit destinations, compare options faster, and continue planning without starting over.
            </p>

            <div className="mt-5 inline-flex items-start gap-2.5 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm text-slate-600 shadow-sm">
              <Heart className="mt-0.5 h-4 w-4 shrink-0 fill-rose-500 text-rose-500" />
              <p>
                Saved items are stored <span className="font-semibold text-slate-900">on this device</span> for both signed-in and guest browsing sessions.
              </p>
            </div>
          </div>
        </section>

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
                          <p className="text-[1.5rem] font-black leading-tight text-slate-950">{trip.price ? `$${trip.price}` : "Price unavailable"}</p>
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
            <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
              {recentSearches.map((entry) => (
                <article key={entry.id} className="group rounded-3xl border border-slate-200/90 bg-white p-5 shadow-[0_24px_55px_-42px_rgba(15,23,42,0.72)] transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_28px_62px_-38px_rgba(15,23,42,0.74)]">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <span className="inline-flex rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                      {entry.type === "flight" ? "Flight" : "Hotel"}
                    </span>
                    <button type="button" aria-label="Remove recent search" onClick={() => handleRemoveRecent(entry.id)} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-800">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <h3 className="line-clamp-1 text-lg font-black tracking-tight text-slate-900">{entry.label}</h3>
                  <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-slate-600">{entry.subtitle}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.09em] text-slate-500">Searched {formatDate(entry.createdAt)}</p>
                  <Link href={entry.href} className="mt-4 inline-flex min-h-11 items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-900">
                    Repeat search
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
