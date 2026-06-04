"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, X } from "lucide-react";

import {
  clearRecentSearches,
  readRecentSearches,
  removeRecentSearch,
  type RecentSearchEntry,
} from "@/lib/recent-searches";

const DESTINATION_IMAGE_MAP: Array<{ keys: string[]; image: string }> = [
  { keys: ["new york", "nyc", "jfk", "lga", "ewr"], image: "https://images.unsplash.com/photo-1496588152823-86ff7695e68f?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["los angeles", "lax"], image: "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["las vegas", "las"], image: "https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["miami", "mia"], image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["orlando", "mco"], image: "https://images.unsplash.com/photo-1597466599360-3b9775841aec?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["chicago", "ord", "mdw"], image: "https://images.unsplash.com/photo-1494522855154-9297ac14b55f?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["houston", "iah", "hou"], image: "https://images.unsplash.com/photo-1531218150217-54595bc2b934?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["san francisco", "sfo"], image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["seattle", "sea"], image: "https://images.unsplash.com/photo-1502175353174-a7a70e73b362?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["dallas", "dfw", "dal"], image: "https://images.unsplash.com/photo-1511854140801-50d01698950b?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["atlanta", "atl"], image: "https://images.unsplash.com/photo-1575916687840-f4f9f8f8f43d?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["boston", "bos"], image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["washington", "iad", "dca"], image: "https://images.unsplash.com/photo-1617581629397-a72507c3de9e?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["denver", "den"], image: "https://images.unsplash.com/photo-1546156929-a4c0ac411f47?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["phoenix", "phx"], image: "https://images.unsplash.com/photo-1597262975002-c5c3b14bbd62?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["nashville", "bna"], image: "https://images.unsplash.com/photo-1588493000894-5f2f4a94f2cf?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["portland", "pdx"], image: "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["honolulu", "hnl"], image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["london", "lhr", "gatwick", "lgw", "united kingdom", "uk"], image: "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["paris", "cdg", "france"], image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["dubai", "dxb", "united arab emirates", "uae"], image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["tokyo", "hnd", "nrt", "japan"], image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["lagos", "los", "nigeria"], image: "https://images.unsplash.com/photo-1576485290814-1c72aa4bbb8e?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["abuja", "abv"], image: "https://images.unsplash.com/photo-1489493585363-d69421e0edd3?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["toronto", "yyz", "canada"], image: "https://images.unsplash.com/photo-1517090504586-fde19ea6066f?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["vancouver", "yvr"], image: "https://images.unsplash.com/photo-1578922746465-3a80a228f223?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["cancun", "cun", "mexico"], image: "https://images.unsplash.com/photo-1552074284-5e88ef1aef18?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["mexico city", "mex"], image: "https://images.unsplash.com/photo-1585464231875-d9ef1f5ad396?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["madrid", "mad", "spain"], image: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["barcelona", "bcn"], image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["rome", "fco", "italy"], image: "https://images.unsplash.com/photo-1525874684015-58379d421a52?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["amsterdam", "ams", "netherlands"], image: "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["berlin", "ber", "germany"], image: "https://images.unsplash.com/photo-1560969184-10fe8719e047?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["frankfurt", "fra"], image: "https://images.unsplash.com/photo-1570148624566-b48c95b4b69d?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["istanbul", "ist", "turkey"], image: "https://images.unsplash.com/photo-1527838832700-5059252407fa?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["doha", "doh", "qatar"], image: "https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["singapore", "sin"], image: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["bangkok", "bkk", "thailand"], image: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["accra", "acc", "ghana"], image: "https://images.unsplash.com/photo-1553901753-215db3446770?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["nairobi", "nbo", "kenya"], image: "https://images.unsplash.com/photo-1523805009345-7448845a9e53?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["johannesburg", "jnb", "south africa"], image: "https://images.unsplash.com/photo-1576485290814-1c72aa4bbb8e?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["cape town", "cpt"], image: "https://images.unsplash.com/photo-1576485290814-1c72aa4bbb8e?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["cairo", "cai", "egypt"], image: "https://images.unsplash.com/photo-1539650116574-75c0c6d73f56?auto=format&fit=crop&w=1200&q=80" },
  { keys: ["casablanca", "cmn", "morocco"], image: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80" },
];

const GENERIC_FLIGHT_IMAGES = [
  "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1517479149777-5f3b1511d5ad?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?auto=format&fit=crop&w=1200&q=80",
];
const GENERIC_HOTEL_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";
const SAVED_RECENT_SEARCHES_KEY = "kurioticket_saved_recent_searches_v1";

const readSavedRecentSearchIds = () => {
  try {
    const rawSavedIds = window.localStorage.getItem(SAVED_RECENT_SEARCHES_KEY);
    if (!rawSavedIds) return new Set<string>();
    const parsedSavedIds = JSON.parse(rawSavedIds);
    if (!Array.isArray(parsedSavedIds)) return new Set<string>();
    return new Set(parsedSavedIds.filter((value): value is string => typeof value === "string"));
  } catch {
    return new Set<string>();
  }
};

const normalizeText = (value: string | undefined) =>
  (value || "").toLowerCase().trim().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ");

const resolveMappedImage = (candidates: string[]): string | null => {
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeText(candidate);
    if (!normalizedCandidate) continue;
    const match = DESTINATION_IMAGE_MAP.find(({ keys }) =>
      keys.some((key) => normalizedCandidate.includes(normalizeText(key)))
    );
    if (match) return match.image;
  }
  return null;
};

const pickGenericFlightImage = (id: string) => {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return GENERIC_FLIGHT_IMAGES[hash % GENERIC_FLIGHT_IMAGES.length];
};

const resolveCardImage = (entry: RecentSearchEntry): string => {
  const baseCandidates = [entry.label, entry.subtitle];
  if (entry.type === "flight") {
    const flightParams = entry.params as { destination?: string; origin?: string };
    const destinationMatch = resolveMappedImage([flightParams.destination || "", ...baseCandidates]);
    if (destinationMatch) return destinationMatch;
    const originFallback = resolveMappedImage([flightParams.origin || ""]);
    if (originFallback) return originFallback;
    return pickGenericFlightImage(entry.id);
  }

  const hotelParams = entry.params as { destination?: string };
  const hotelMatch = resolveMappedImage([hotelParams.destination || "", ...baseCandidates]);
  if (hotelMatch) return hotelMatch;
  return GENERIC_HOTEL_IMAGE;
};

export function RecentSearches() {
  const [entries, setEntries] = useState<RecentSearchEntry[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;

    const timeoutId = window.setTimeout(() => {
      if (!isMounted) return;
      setEntries(readRecentSearches());
      setSavedIds(readSavedRecentSearchIds());
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, []);

  const persistSavedIds = (nextSavedIds: Set<string>) => {
    try {
      window.localStorage.setItem(SAVED_RECENT_SEARCHES_KEY, JSON.stringify(Array.from(nextSavedIds)));
    } catch {
      // no-op: local storage unavailable
    }
  };

  const handleRemove = (id: string) => {
    setEntries(removeRecentSearch(id));
    setSavedIds((previousSavedIds) => {
      if (!previousSavedIds.has(id)) return previousSavedIds;
      const nextSavedIds = new Set(previousSavedIds);
      nextSavedIds.delete(id);
      persistSavedIds(nextSavedIds);
      return nextSavedIds;
    });
  };

  const handleClearAll = () => {
    const removedIds = new Set(entries.map((entry) => entry.id));
    clearRecentSearches();
    setEntries([]);
    setSavedIds((previousSavedIds) => {
      if (!previousSavedIds.size) return previousSavedIds;
      const nextSavedIds = new Set(previousSavedIds);
      removedIds.forEach((id) => nextSavedIds.delete(id));
      persistSavedIds(nextSavedIds);
      return nextSavedIds;
    });
  };

  const handleToggleSaved = (id: string) => {
    setSavedIds((previousSavedIds) => {
      const nextSavedIds = new Set(previousSavedIds);
      if (nextSavedIds.has(id)) {
        nextSavedIds.delete(id);
      } else {
        nextSavedIds.add(id);
      }
      persistSavedIds(nextSavedIds);
      return nextSavedIds;
    });
  };

  if (!entries.length) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-1">
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold leading-tight text-slate-900 md:text-[0.95rem]">Recent searches</h2>
          <p className="text-xs leading-tight text-slate-600 md:text-[0.8rem]">Pick up where you left off.</p>
        </div>
        <button
          type="button"
          onClick={handleClearAll}
          className="focus-ring text-xs font-medium text-slate-500 transition-colors hover:text-slate-700"
        >
          Clear all
        </button>
      </div>

      <div className="grid auto-cols-[220px] grid-flow-col gap-3 overflow-x-auto pb-1.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:grid-flow-row md:grid-cols-3 md:auto-cols-auto md:overflow-visible lg:grid-cols-4">
        {entries.map((entry) => (
          <article key={entry.id} className="h-full min-w-0">
            <Link
              href={entry.href}
              className="focus-ring group relative flex h-full min-h-[172px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <div className="relative h-[74px] w-full overflow-hidden">
                <Image
                  src={resolveCardImage(entry)}
                  alt={entry.label}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 220px"
                  className="object-cover"
                />
              </div>
              <div className="absolute right-2 top-2 flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label={savedIds.has(entry.id) ? "Unsave recent search" : "Save recent search"}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleToggleSaved(entry.id);
                  }}
                  className={`focus-ring rounded-full border p-1.5 transition-colors ${
                    savedIds.has(entry.id)
                      ? "border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100"
                      : "border-slate-200 bg-white/95 text-slate-600 hover:bg-white hover:text-slate-900"
                  }`}
                >
                  <Heart className={`h-3.5 w-3.5 ${savedIds.has(entry.id) ? "fill-current" : ""}`} />
                </button>
                <button
                  type="button"
                  aria-label="Remove recent search"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleRemove(entry.id);
                  }}
                  className="focus-ring rounded-full border border-slate-200 bg-white/95 p-1.5 text-slate-600 transition-colors hover:bg-white hover:text-slate-900"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex flex-1 flex-col gap-1.5 p-3">
                <span className="inline-flex w-fit rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                  {entry.type === "flight" ? "Flight" : "Hotel"}
                </span>
                <p className="line-clamp-1 text-[0.92rem] font-semibold leading-tight text-slate-900">{entry.label}</p>
                <p className="line-clamp-2 text-xs leading-relaxed text-slate-600">{entry.subtitle}</p>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
