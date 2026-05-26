"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Heart, Search, Trash2, X } from "lucide-react";

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
    <div className="space-y-8">
      <section className="rounded-3xl border border-rose-100 bg-gradient-to-r from-rose-50 via-pink-50 to-white p-6 shadow-sm md:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">
          <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
          Saved on this device
        </div>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Saved trips & recent searches</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 md:text-base">
          Your saved trips and search history are stored locally in this browser for quick access whether you are signed in or browsing as a guest.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900">Saved trips</h2>
          {savedTrips.length > 0 ? (
            <button type="button" onClick={handleClearSaved} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-rose-200 hover:text-rose-700">
              <Trash2 className="h-4 w-4" />
              Clear all saved
            </button>
          ) : null}
        </div>

        {savedTrips.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/60 p-8 text-center">
            <Heart className="mx-auto h-8 w-8 fill-rose-500 text-rose-500" />
            <p className="mt-3 text-sm font-semibold text-slate-900">Save trips you love and come back to them anytime.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {savedTrips.map((trip) => (
              <article key={trip.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {trip.image ? <img src={trip.image} alt={trip.imageAlt ?? trip.title} className="h-36 w-full object-cover" loading="lazy" /> : null}
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="line-clamp-1 text-base font-bold text-slate-900">{trip.title}</h3>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{trip.route}</p>
                    </div>
                    <Heart className="h-5 w-5 shrink-0 fill-rose-500 text-rose-500" />
                  </div>

                  <p className="line-clamp-2 text-sm text-slate-600">{trip.note}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">{trip.price ? `From $${trip.price}` : "Price unavailable"}</span>
                    <Link href={trip.href} className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:text-indigo-900">
                      View
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                  <button type="button" onClick={() => handleUnsaveTrip(trip.id)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-rose-700">
                    <X className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900">Recent searches</h2>
          {recentSearches.length > 0 ? (
            <button type="button" onClick={handleClearRecent} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-indigo-200 hover:text-indigo-700">
              <Trash2 className="h-4 w-4" />
              Clear all recent
            </button>
          ) : null}
        </div>

        {recentSearches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <Search className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-3 text-sm font-semibold text-slate-900">Your recent searches will appear here.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recentSearches.map((entry) => (
              <article key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                    {entry.type === "flight" ? "Flight" : "Hotel"}
                  </span>
                  <button type="button" aria-label="Remove recent search" onClick={() => handleRemoveRecent(entry.id)} className="rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <h3 className="line-clamp-1 text-base font-bold text-slate-900">{entry.label}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{entry.subtitle}</p>
                <p className="mt-2 text-xs text-slate-500">Searched {formatDate(entry.createdAt)}</p>
                <Link href={entry.href} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:text-indigo-900">
                  Repeat search
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
