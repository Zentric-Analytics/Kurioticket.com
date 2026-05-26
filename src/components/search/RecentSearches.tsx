"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

import {
  clearRecentSearches,
  readRecentSearches,
  removeRecentSearch,
  type RecentSearchEntry,
} from "@/lib/recent-searches";

const CITY_IMAGE_MAP: Record<string, string> = {
  "new york": "https://images.unsplash.com/photo-1496588152823-86ff7695e68f?auto=format&fit=crop&w=1200&q=80",
  london: "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?auto=format&fit=crop&w=1200&q=80",
  paris: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80",
  dubai: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80",
  tokyo: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80",
  lagos: "https://images.unsplash.com/photo-1576485290814-1c72aa4bbb8e?auto=format&fit=crop&w=1200&q=80",
  abuja: "https://images.unsplash.com/photo-1489493585363-d69421e0edd3?auto=format&fit=crop&w=1200&q=80",
  houston: "https://images.unsplash.com/photo-1531218150217-54595bc2b934?auto=format&fit=crop&w=1200&q=80",
  miami: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80",
  "las vegas": "https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?auto=format&fit=crop&w=1200&q=80",
  "san francisco": "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80",
  seattle: "https://images.unsplash.com/photo-1502175353174-a7a70e73b362?auto=format&fit=crop&w=1200&q=80",
};

const GENERIC_FLIGHT_IMAGE =
  "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80";
const GENERIC_HOTEL_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";

const resolveCardImage = (entry: RecentSearchEntry): string => {
  const searchText = `${entry.label} ${entry.subtitle}`.toLowerCase();
  const mapped = Object.entries(CITY_IMAGE_MAP).find(([city]) => searchText.includes(city));
  if (mapped) return mapped[1];
  return entry.type === "flight" ? GENERIC_FLIGHT_IMAGE : GENERIC_HOTEL_IMAGE;
};

export function RecentSearches() {
  const [entries, setEntries] = useState<RecentSearchEntry[]>([]);

  useEffect(() => {
    setEntries(readRecentSearches());
  }, []);

  const handleRemove = (id: string) => {
    setEntries(removeRecentSearch(id));
  };

  const handleClearAll = () => {
    clearRecentSearches();
    setEntries([]);
  };

  if (!entries.length) {
    return null;
  }

  return (
    <section className="mt-12">
      <div className="mb-3.5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 md:text-base">Recent searches</h2>
          <p className="text-sm text-slate-600">Pick up where you left off.</p>
        </div>
        <button
          type="button"
          onClick={handleClearAll}
          className="focus-ring text-xs font-medium text-slate-500 transition-colors hover:text-slate-700"
        >
          Clear all
        </button>
      </div>

      <div className="flex snap-x gap-2.5 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:gap-3 md:overflow-visible lg:grid-cols-4">
        {entries.map((entry) => (
          <Link
            key={entry.id}
            href={entry.href}
            className="focus-ring group relative min-h-[170px] min-w-[220px] snap-start overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition-colors hover:border-slate-300 hover:bg-white md:min-w-0"
          >
            <img src={resolveCardImage(entry)} alt={entry.label} className="h-20 w-full object-cover" loading="lazy" />
            <button
              type="button"
              aria-label="Remove recent search"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handleRemove(entry.id);
              }}
              className="focus-ring absolute right-2 top-2 rounded-full border border-slate-200 bg-white/95 p-1.5 text-slate-600 transition-colors hover:bg-white hover:text-slate-900"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="space-y-1 p-3">
              <span className="inline-flex rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-600">
                {entry.type === "flight" ? "Flight" : "Hotel"}
              </span>
              <p className="line-clamp-1 text-sm font-semibold text-slate-900">{entry.label}</p>
              <p className="line-clamp-2 text-xs text-slate-600">{entry.subtitle}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
