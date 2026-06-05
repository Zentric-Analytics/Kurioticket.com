"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  SlidersHorizontal,
  Star,
  Tag,
  ThumbsUp,
  X,
  type LucideIcon,
} from "lucide-react";

import type { PublicHotelResult } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { HotelCard } from "@/components/results/HotelCard";
import { HotelSearchBar } from "@/components/search/HotelSearchBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn, formatCurrency } from "@/lib/utils";

const hotelResultStackClass = "w-full max-w-[800px]";
const desktopHotelFilterStickyTopClass =
  "lg:sticky lg:top-[7.25rem] lg:max-h-[calc(100vh-8.5rem)] lg:overflow-y-auto lg:overscroll-contain";

const FILTER_APPLYING_DELAY_MS = 700;
const FILTER_SCROLLBAR_HIDE_DELAY_MS = 700;
const DEFAULT_MIN_RATING = 3;

const messages = [
  "Searching hotel partners...",
  "Comparing total stay prices...",
  "Checking arrival convenience...",
  "Finding low-stress stays...",
];

const POPULAR_FILTERS = [
  {
    value: "free-wifi",
    label: "Free Wi-Fi",
    terms: ["free wi-fi", "free wifi", "wifi", "wi-fi"],
  },
  {
    value: "breakfast",
    label: "Breakfast included/available",
    terms: ["breakfast"],
  },
  {
    value: "free-cancellation",
    label: "Free cancellation",
    terms: ["free cancellation", "flexible cancellation"],
  },
  { value: "parking", label: "Parking", terms: ["parking"] },
  { value: "pool", label: "Pool", terms: ["pool"] },
  {
    value: "airport-shuttle",
    label: "Airport shuttle",
    terms: ["airport shuttle", "airport transit", "airport"],
  },
];

const MEAL_FILTERS = [
  { value: "breakfast", label: "Breakfast", terms: ["breakfast"] },
  {
    value: "room-only",
    label: "Room only",
    terms: ["room only", "accommodation only"],
  },
  { value: "half-board", label: "Half board", terms: ["half board"] },
  { value: "full-board", label: "Full board", terms: ["full board"] },
  {
    value: "all-inclusive",
    label: "All inclusive",
    terms: ["all inclusive", "all-inclusive"],
  },
];

const CANCELLATION_FILTERS = [
  {
    value: "free-cancellation",
    label: "Free cancellation",
    terms: ["free cancellation"],
  },
  {
    value: "flexible-cancellation",
    label: "Flexible cancellation",
    terms: ["flexible cancellation", "flexible cancellation window"],
  },
  {
    value: "policy-available",
    label: "Cancellation policy available",
    terms: [
      "cancellation policy available",
      "policy shown",
      "cancellation details",
      "cancellation rules",
      "rate comments",
    ],
  },
];

const FACILITY_FILTERS = [
  {
    value: "free-wifi",
    label: "Free Wi-Fi",
    terms: ["free wi-fi", "free wifi", "wifi", "wi-fi"],
  },
  { value: "parking", label: "Parking", terms: ["parking"] },
  { value: "pool", label: "Pool", terms: ["pool"] },
  { value: "spa", label: "Spa", terms: ["spa", "wellness"] },
  { value: "fitness", label: "Fitness center", terms: ["fitness", "gym"] },
  {
    value: "airport-shuttle",
    label: "Airport shuttle",
    terms: ["airport shuttle", "airport transit access"],
  },
  { value: "workspace", label: "Workspace", terms: ["workspace", "desk"] },
  { value: "quiet-rooms", label: "Quiet rooms", terms: ["quiet"] },
  {
    value: "front-desk",
    label: "24-hour front desk",
    terms: ["24-hour desk", "24 hour desk", "24-hour front desk"],
  },
  {
    value: "late-check-in",
    label: "Late check-in",
    terms: ["late check-in", "late checkin"],
  },
];

const PROPERTY_TYPE_FILTERS = [
  { value: "hotel", label: "Hotel", terms: ["hotel"] },
  {
    value: "apartment",
    label: "Apartment",
    terms: ["apartment", "apartments", "aparthotel"],
  },
  { value: "resort", label: "Resort", terms: ["resort"] },
  { value: "suite", label: "Suites", terms: ["suite", "suites"] },
  { value: "inn", label: "Inn", terms: ["inn"] },
  { value: "hostel", label: "Hostel", terms: ["hostel"] },
  { value: "villa", label: "Villa", terms: ["villa"] },
];

const LOCATION_AREA_FILTERS = [
  {
    value: "city-centre",
    label: "City Centre",
    terms: [
      "city centre",
      "city center",
      "central",
      "downtown",
      "centre",
      "center",
    ],
  },
  {
    value: "airport-area",
    label: "Airport Area",
    terms: ["airport", "airport area", "airport link", "airport transit"],
  },
  {
    value: "business-district",
    label: "Business District",
    terms: ["business district", "financial district", "business area"],
  },
  {
    value: "near-attractions",
    label: "Near Attractions",
    terms: ["attraction", "attractions", "landmark", "museum", "tourist"],
  },
  {
    value: "residential-area",
    label: "Residential Area",
    terms: ["residential", "neighborhood", "neighbourhood"],
  },
];

const ROOM_TYPE_FILTERS = [
  {
    value: "single-room",
    label: "Single Room",
    terms: ["single room", "single standard", "single"],
  },
  {
    value: "double-room",
    label: "Double Room",
    terms: ["double room", "double standard", "double"],
  },
  {
    value: "twin-room",
    label: "Twin Room",
    terms: ["twin room", "twin standard", "twin"],
  },
  {
    value: "family-room",
    label: "Family Room",
    terms: ["family room", "family standard", "family"],
  },
  { value: "suite", label: "Suite", terms: ["suite"] },
  { value: "standard-room", label: "Standard Room", terms: ["standard room"] },
  { value: "deluxe-room", label: "Deluxe Room", terms: ["deluxe room"] },
  { value: "studio", label: "Studio", terms: ["studio"] },
];

const BED_TYPE_FILTERS = [
  {
    value: "twin-beds",
    label: "Twin Beds",
    terms: ["twin bed", "twin beds", "2 twin", "two twin"],
  },
  {
    value: "double-bed",
    label: "Double Bed",
    terms: ["double bed", "double beds"],
  },
  {
    value: "queen-bed",
    label: "Queen Bed",
    terms: ["queen bed", "queen beds", "queen room"],
  },
  {
    value: "king-bed",
    label: "King Bed",
    terms: ["king bed", "king beds", "king room"],
  },
];

type FilterOption = {
  value: string;
  label: string;
  count: number;
};

type TermFilter = {
  value: string;
  label: string;
  terms: string[];
};

type ActiveHotelFilterChip = {
  key: string;
  label: string;
  group?: keyof HotelFilterSelections;
  value?: string;
  kind?: "maxPrice" | "minRating";
};

type HotelFilterSelections = {
  popular: string[];
  propertyTypes: string[];
  meals: string[];
  cancellationPolicies: string[];
  facilities: string[];
  locations: string[];
  roomTypes: string[];
  bedTypes: string[];
};

const emptySelections: HotelFilterSelections = {
  popular: [],
  propertyTypes: [],
  meals: [],
  cancellationPolicies: [],
  facilities: [],
  locations: [],
  roomTypes: [],
  bedTypes: [],
};

function getSingleHotelResultCurrency(results: PublicHotelResult[]) {
  const currencies = results
    .map((result) => result.currency?.toUpperCase())
    .filter(Boolean);
  const [firstCurrency] = currencies;

  return firstCurrency ?? "USD";
}

const getResultMaxPrice = (hotels: PublicHotelResult[]) =>
  Math.max(
    300,
    Math.ceil(Math.max(...hotels.map((hotel) => hotel.totalPrice), 300) / 100) *
      100,
  );

type HotelSummarySortMode = "cheapest" | "bestValue" | "topRated";

type HotelSummaryItem = {
  label: string;
  value: string;
  helperText: string;
  icon: LucideIcon;
  iconClassName: string;
  iconElementClassName?: string;
  sortMode: HotelSummarySortMode;
};

export function HotelResultsClient() {
  const params = useSearchParams();

  const [results, setResults] = useState<PublicHotelResult[]>([]);
  const [visibleFiltered, setVisibleFiltered] = useState<PublicHotelResult[]>(
    [],
  );
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messageIndex, setMessageIndex] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterApplying, setFilterApplying] = useState(false);
  const [filterScrollbarVisible, setFilterScrollbarVisible] = useState(false);
  const [maxPrice, setMaxPrice] = useState(1200);
  const [minRating, setMinRating] = useState(DEFAULT_MIN_RATING);
  const [selectedFilters, setSelectedFilters] =
    useState<HotelFilterSelections>(emptySelections);
  const [hotelSummarySortMode, setHotelSummarySortMode] =
    useState<HotelSummarySortMode>("cheapest");

  const filterApplyingTimeoutRef = useRef<number | null>(null);
  const filterScrollbarTimeoutRef = useRef<number | null>(null);

  const body = useMemo(
    () => ({
      destination: params.get("destination") || "Tokyo",
      checkIn: params.get("checkIn") || nextDate(28),
      checkOut: params.get("checkOut") || nextDate(35),
      guests: Number(params.get("guests") || 2),
      rooms: Number(params.get("rooms") || 1),
      sort: params.get("sort") || "cheapest",
    }),
    [params],
  );

  useEffect(() => {
    let active = true;

    fetch("/api/hotels/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (response) => {
        const data = await response.json();

        if (data.warningCategory === "no_live_hotel_provider") {
          throw new Error(
            "Hotel search is temporarily unavailable for this request. We only show stay options when price, availability, fees, and rules can be reviewed with the provider. Please try again later or start a new search.",
          );
        }

        if (!response.ok) {
          throw new Error(data.error || "Unable to search hotels.");
        }

        return data as { results: PublicHotelResult[]; warnings?: string[] };
      })
      .then((data) => {
        if (!active) return;

        setResults(data.results);
        setVisibleFiltered(data.results);
        setWarnings(data.warnings || []);
        setFilterApplying(false);
        setMaxPrice(getResultMaxPrice(data.results));
        setSelectedFilters(emptySelections);
      })
      .catch((searchError) => {
        if (!active) return;

        setError(
          searchError instanceof Error
            ? searchError.message
            : "Unable to search hotels.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [body]);

  useEffect(() => {
    if (!loading) return;

    const id = window.setInterval(
      () => setMessageIndex((current) => (current + 1) % messages.length),
      1200,
    );

    return () => window.clearInterval(id);
  }, [loading]);

  const filterOptions = useMemo(
    () => buildHotelFilterOptions(results),
    [results],
  );

  const filtered = useMemo(
    () =>
      results.filter((hotel) =>
        hotelMatchesFilters(hotel, maxPrice, minRating, selectedFilters),
      ),
    [maxPrice, minRating, results, selectedFilters],
  );

  const resultMaxPrice = useMemo(() => getResultMaxPrice(results), [results]);
  const resultCurrency = useMemo(
    () => getSingleHotelResultCurrency(results),
    [results],
  );

  const activeFilterChips = useMemo(
    () =>
      buildActiveFilterChips(
        selectedFilters,
        maxPrice,
        resultMaxPrice,
        minRating,
        resultCurrency,
      ),
    [maxPrice, minRating, resultCurrency, resultMaxPrice, selectedFilters],
  );

  const visibleFilteredHotels = filterApplying ? visibleFiltered : filtered;
  const sortedVisibleHotels = useMemo(
    () => sortHotelSummaryResults(visibleFilteredHotels, hotelSummarySortMode),
    [hotelSummarySortMode, visibleFilteredHotels],
  );
  const hotelSummaryItems = useMemo(
    () => buildHotelSummaryItems(visibleFilteredHotels),
    [visibleFilteredHotels],
  );

  const showFilteredEmptyState =
    !loading &&
    !error &&
    !filterApplying &&
    results.length > 0 &&
    filtered.length === 0;

  useEffect(() => {
    if (!filterApplying || loading || error) return;

    if (filterApplyingTimeoutRef.current !== null) {
      window.clearTimeout(filterApplyingTimeoutRef.current);
    }

    filterApplyingTimeoutRef.current = window.setTimeout(() => {
      setVisibleFiltered(filtered);
      setFilterApplying(false);
      filterApplyingTimeoutRef.current = null;
    }, FILTER_APPLYING_DELAY_MS);

    return () => {
      if (filterApplyingTimeoutRef.current !== null) {
        window.clearTimeout(filterApplyingTimeoutRef.current);
        filterApplyingTimeoutRef.current = null;
      }
    };
  }, [error, filtered, filterApplying, loading]);

  useEffect(() => {
    return () => {
      if (filterApplyingTimeoutRef.current !== null) {
        window.clearTimeout(filterApplyingTimeoutRef.current);
      }

      if (filterScrollbarTimeoutRef.current !== null) {
        window.clearTimeout(filterScrollbarTimeoutRef.current);
      }
    };
  }, []);

  function showFilterScrollbarWhileScrolling() {
    setFilterScrollbarVisible(true);

    if (filterScrollbarTimeoutRef.current !== null) {
      window.clearTimeout(filterScrollbarTimeoutRef.current);
    }

    filterScrollbarTimeoutRef.current = window.setTimeout(() => {
      setFilterScrollbarVisible(false);
      filterScrollbarTimeoutRef.current = null;
    }, FILTER_SCROLLBAR_HIDE_DELAY_MS);
  }

  function triggerFilterApplying() {
    setVisibleFiltered((current) => {
      if (filterApplying && current.length > 0) return current;
      return filtered;
    });

    setFilterApplying(true);

    if (filterApplyingTimeoutRef.current !== null) {
      window.clearTimeout(filterApplyingTimeoutRef.current);
      filterApplyingTimeoutRef.current = null;
    }
  }

  const updateMaxPrice = (value: number) => {
    triggerFilterApplying();
    setMaxPrice(value);
  };

  const updateMinRating = (value: number) => {
    triggerFilterApplying();
    setMinRating(value);
  };

  const resetFilters = () => {
    triggerFilterApplying();
    setMaxPrice(resultMaxPrice);
    setMinRating(DEFAULT_MIN_RATING);
    setSelectedFilters(emptySelections);
    setFiltersOpen(false);
  };

  const toggleFilter = (group: keyof HotelFilterSelections, value: string) => {
    triggerFilterApplying();
    setSelectedFilters((current) => ({
      ...current,
      [group]: current[group].includes(value)
        ? current[group].filter((item) => item !== value)
        : [...current[group], value],
    }));
  };

  const removeFilterChip = (chip: ActiveHotelFilterChip) => {
    triggerFilterApplying();

    if (chip.kind === "maxPrice") {
      setMaxPrice(resultMaxPrice);
      return;
    }

    if (chip.kind === "minRating") {
      setMinRating(DEFAULT_MIN_RATING);
      return;
    }

    const { group, value } = chip;

    if (!group || !value) return;

    setSelectedFilters((current) => ({
      ...current,
      [group]: current[group].filter((item) => item !== value),
    }));
  };

  return (
    <main className="flex-1 overflow-x-clip bg-[#f6f8fb] pb-8">
      <div className="sticky top-0 z-50 border-b border-slate-200/70 bg-[#f6f8fb]/95 px-4 py-2.5 shadow-[0_4px_14px_rgba(15,23,42,0.04)] backdrop-blur sm:hidden">
        <HotelSearchBar
          key={`mobile-${body.destination}-${body.checkIn}-${body.checkOut}-${body.guests}-${body.rooms}-${body.sort}`}
          initialDestination={body.destination}
          initialCheckIn={body.checkIn}
          initialCheckOut={body.checkOut}
          initialGuests={body.guests}
          initialRooms={body.rooms}
          initialSort={body.sort}
          errorRole="alert"
          compact
          onOpenFilters={() => setFiltersOpen(true)}
        />
      </div>

      <section className="sticky top-0 z-40 hidden border-b border-slate-200/80 bg-[#f6f8fb]/95 py-3 shadow-sm shadow-slate-900/5 backdrop-blur sm:block">
        <div className="page-shell">
          <HotelSearchBar
            key={`${body.destination}-${body.checkIn}-${body.checkOut}-${body.guests}-${body.rooms}-${body.sort}`}
            initialDestination={body.destination}
            initialCheckIn={body.checkIn}
            initialCheckOut={body.checkOut}
            initialGuests={body.guests}
            initialRooms={body.rooms}
            initialSort={body.sort}
            errorRole="alert"
            compact
            className="min-w-0"
          />
        </div>
      </section>

      <div className="page-shell grid gap-5 pb-6 pt-5 sm:pt-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside
          className={cn(
            "hotel-filter-scrollbar hidden lg:block lg:self-start lg:overflow-x-hidden",
            desktopHotelFilterStickyTopClass,
            filterScrollbarVisible
              ? "hotel-filter-scrollbar--visible"
              : undefined,
          )}
          onScroll={showFilterScrollbarWhileScrolling}
        >
          <HotelFilters
            maxPrice={maxPrice}
            setMaxPrice={updateMaxPrice}
            resultMaxPrice={resultMaxPrice}
            priceCurrency={resultCurrency}
            minRating={minRating}
            setMinRating={updateMinRating}
            options={filterOptions}
            selectedFilters={selectedFilters}
            toggleFilter={toggleFilter}
          />
        </aside>

        <section className="min-w-0 space-y-4">
          {!loading && !error && warnings.length ? (
            <div className="rounded-md border border-amber/30 bg-amber/10 p-3 text-sm text-amber">
              Some provider checks may be limited for this hotel search. Review
              final availability, taxes, fees, and cancellation rules with the
              provider before booking.
            </div>
          ) : null}

          {loading ? (
            <div className="space-y-4">
              <div className="rounded-md border border-indigo-100 bg-indigo-50/70 p-4 text-sm font-semibold text-violet-700">
                {messages[messageIndex]}
              </div>
              <HotelSkeleton />
              <HotelSkeleton />
              <HotelSkeleton />
            </div>
          ) : error ? (
            <div className="rounded-md border border-danger/30 bg-red-50 p-4 text-danger">
              {error}
            </div>
          ) : showFilteredEmptyState ? (
            <div className={cn(hotelResultStackClass, "space-y-3")}>
              <ActiveHotelFilterChips
                chips={activeFilterChips}
                onRemove={removeFilterChip}
                onClearAll={resetFilters}
              />
              <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-[0_16px_40px_-24px_rgba(30,27,75,0.45)]">
                <p className="text-lg font-bold text-indigo-950">
                  No stays match these filters
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                  Try increasing the price range, lowering the star rating, or
                  clearing selected hotel filters to see more available options.
                </p>
                <Button
                  variant="secondary"
                  className="mt-4"
                  onClick={resetFilters}
                >
                  Reset filters
                </Button>
              </div>
            </div>
          ) : (
            <div className={cn(hotelResultStackClass, "space-y-3")}>
              <div
                className={cn(
                  "space-y-3 transition-opacity",
                  filterApplying ? "animate-pulse opacity-80" : undefined,
                )}
              >
                <div className="space-y-2">
                  <div className="w-full rounded-xl border border-indigo-100 bg-white px-4 py-3 shadow-sm shadow-slate-900/5">
                    <h1 className="text-[15px] font-bold leading-tight text-slate-900 sm:text-[17px] lg:text-lg">
                      We found {visibleFilteredHotels.length} places to stay for
                      you
                    </h1>
                  </div>
                  <ActiveHotelFilterChips
                    chips={activeFilterChips}
                    onRemove={removeFilterChip}
                    onClearAll={resetFilters}
                  />
                </div>

                <HotelSummaryRow
                  activeSortMode={hotelSummarySortMode}
                  items={hotelSummaryItems}
                  onSortModeChange={setHotelSummarySortMode}
                />

                {filterApplying ? (
                  <div className="space-y-3">
                    <div
                      role="status"
                      aria-live="polite"
                      className="rounded-xl border border-indigo-100 bg-white p-4 text-sm font-semibold text-slate-600 shadow-sm"
                    >
                      Updating results...
                    </div>
                    <HotelSkeleton />
                    <HotelSkeleton />
                  </div>
                ) : sortedVisibleHotels.length ? (
                  sortedVisibleHotels.map((hotel) => (
                    <HotelCard key={hotel.id} hotel={hotel} />
                  ))
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm font-semibold text-muted shadow-sm">
                    No stays match these filters. Widen your filters to see more
                    available options.
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-50 bg-navy/40 lg:hidden",
          filtersOpen ? "block" : "hidden",
        )}
        onClick={() => setFiltersOpen(false)}
      />

      <aside
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 flex max-h-[86dvh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl transition-transform lg:hidden",
          filtersOpen ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div
          className={cn(
            "hotel-filter-scrollbar flex-1 overflow-auto p-5 pb-3",
            filterScrollbarVisible
              ? "hotel-filter-scrollbar--visible"
              : undefined,
          )}
          onScroll={showFilterScrollbarWhileScrolling}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-navy">Filters</h2>
            <Button
              variant="ghost"
              className="h-10 w-10 px-0"
              aria-label="Close filters"
              onClick={() => setFiltersOpen(false)}
            >
              <X size={20} />
            </Button>
          </div>

          <HotelFilters
            maxPrice={maxPrice}
            setMaxPrice={updateMaxPrice}
            resultMaxPrice={resultMaxPrice}
            priceCurrency={resultCurrency}
            minRating={minRating}
            setMinRating={updateMinRating}
            options={filterOptions}
            selectedFilters={selectedFilters}
            toggleFilter={toggleFilter}
          />
        </div>

        <div className="border-t border-slate-200 bg-white p-4">
          <Button
            type="button"
            className="h-12 w-full rounded-xl bg-gradient-to-r from-indigo-700 to-violet-600 text-base font-bold text-white shadow-lg shadow-indigo-700/20"
            onClick={() => {
              triggerFilterApplying();
              setFiltersOpen(false);
            }}
          >
            Done
          </Button>
        </div>
      </aside>
    </main>
  );
}

function HotelSummaryRow({
  activeSortMode,
  items,
  onSortModeChange,
}: {
  activeSortMode: HotelSummarySortMode;
  items: HotelSummaryItem[];
  onSortModeChange: (sortMode: HotelSummarySortMode) => void;
}) {
  if (!items.length) return null;

  return (
    <div
      className="grid min-w-0 gap-2 sm:grid-cols-3"
      aria-label="Hotel result summary"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.sortMode === activeSortMode;

        return (
          <button
            key={item.label}
            type="button"
            className={cn(
              "min-w-0 rounded-2xl border bg-white p-3.5 text-left shadow-[0_14px_30px_-22px_rgba(30,27,75,0.45)] transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_18px_34px_-24px_rgba(30,27,75,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f8fb]",
              isActive
                ? "border-indigo-400 bg-indigo-50/50 shadow-[0_18px_38px_-24px_rgba(79,70,229,0.7)] ring-1 ring-indigo-200"
                : "border-indigo-100/80",
            )}
            aria-pressed={isActive}
            onClick={() => onSortModeChange(item.sortMode)}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  item.iconClassName,
                )}
                aria-hidden="true"
              >
                <Icon
                  className={item.iconElementClassName}
                  size={18}
                  strokeWidth={2.8}
                />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-700">
                  {item.label}
                </p>
                <p className="mt-1 text-base font-bold leading-6 tracking-[-0.02em] text-slate-950">
                  {item.value}
                </p>
                <p className="mt-0.5 text-xs font-medium leading-4 text-slate-500">
                  {item.helperText}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function sortHotelSummaryResults(
  hotels: PublicHotelResult[],
  sortMode: HotelSummarySortMode,
) {
  const indexedHotels = hotels.map((hotel, index) => ({ hotel, index }));

  if (sortMode === "bestValue" && !hotels.some(hasHotelValueScore)) {
    return hotels;
  }

  indexedHotels.sort((first, second) => {
    if (sortMode === "cheapest") {
      return (
        getHotelSortablePrice(first.hotel) - getHotelSortablePrice(second.hotel) ||
        first.index - second.index
      );
    }

    if (sortMode === "topRated") {
      return (
        getHotelSortableRating(second.hotel) -
          getHotelSortableRating(first.hotel) ||
        getHotelSortablePrice(first.hotel) - getHotelSortablePrice(second.hotel) ||
        first.index - second.index
      );
    }

    const firstScore = getHotelValueSortScore(first.hotel);
    const secondScore = getHotelValueSortScore(second.hotel);

    if (firstScore === null && secondScore === null) {
      return first.index - second.index;
    }

    if (firstScore === null) return 1;
    if (secondScore === null) return -1;

    return (
      secondScore - firstScore ||
      getHotelSortablePrice(first.hotel) - getHotelSortablePrice(second.hotel) ||
      first.index - second.index
    );
  });

  return indexedHotels.map(({ hotel }) => hotel);
}

function buildHotelSummaryItems(
  hotels: PublicHotelResult[],
): HotelSummaryItem[] {
  if (!hotels.length) return [];

  const cheapest = hotels.reduce((best, hotel) =>
    getHotelSortablePrice(hotel) < getHotelSortablePrice(best) ? hotel : best,
  );
  const bestValue = hotels.reduce((best, hotel) => {
    const hotelScore = getHotelValueSortScore(hotel);
    const bestScore = getHotelValueSortScore(best);

    if (hotelScore === null && bestScore === null) return best;
    if (hotelScore === null) return best;
    if (bestScore === null) return hotel;

    return hotelScore > bestScore ||
      (hotelScore === bestScore &&
        getHotelSortablePrice(hotel) < getHotelSortablePrice(best))
      ? hotel
      : best;
  });
  const topRated = hotels.reduce((best, hotel) =>
    getHotelSortableRating(hotel) > getHotelSortableRating(best) ||
    (getHotelSortableRating(hotel) === getHotelSortableRating(best) &&
      getHotelSortablePrice(hotel) < getHotelSortablePrice(best))
      ? hotel
      : best,
  );

  return [
    {
      label: "CHEAPEST",
      value: formatCurrency(getHotelSortablePrice(cheapest), cheapest.currency),
      helperText: "Lowest total price",
      icon: Tag,
      iconClassName: "bg-violet-100 text-indigo-700 ring-1 ring-violet-200",
      sortMode: "cheapest",
    },
    {
      label: "BEST VALUE",
      value: formatHotelValueSummary(bestValue),
      helperText: "Best balance",
      icon: ThumbsUp,
      iconClassName: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
      sortMode: "bestValue",
    },
    {
      label: "TOP RATED",
      value: formatHotelRating(topRated.rating),
      helperText: "Highest rating",
      icon: Star,
      iconClassName: "bg-amber-100 text-amber-600 ring-1 ring-amber-200",
      iconElementClassName: "fill-current",
      sortMode: "topRated",
    },
  ];
}

function getHotelSortablePrice(hotel: PublicHotelResult) {
  if (Number.isFinite(hotel.totalPrice)) return hotel.totalPrice;
  if (Number.isFinite(hotel.pricePerNight)) return hotel.pricePerNight;

  return Number.POSITIVE_INFINITY;
}

function getHotelSortableRating(hotel: PublicHotelResult) {
  return Number.isFinite(hotel.rating) ? hotel.rating : Number.NEGATIVE_INFINITY;
}

function hasHotelValueScore(hotel: PublicHotelResult) {
  return getHotelValueSortScore(hotel) !== null;
}

function getHotelValueSortScore(hotel: PublicHotelResult) {
  return Number.isFinite(hotel.valueScore) ? hotel.valueScore : null;
}

function formatHotelValueSummary(hotel: PublicHotelResult) {
  const valueScore = getHotelValueSortScore(hotel);

  if (valueScore !== null) {
    return `${Math.round(valueScore)}/100 score`;
  }

  return "Recommended";
}

function formatHotelRating(rating: number) {
  const formatted = Number.isInteger(rating)
    ? String(rating)
    : rating.toFixed(1);

  return `${formatted} star${rating === 1 ? "" : "s"}`;
}

function ActiveHotelFilterChips({
  chips,
  onRemove,
  onClearAll,
}: {
  chips: ActiveHotelFilterChip[];
  onRemove: (chip: ActiveHotelFilterChip) => void;
  onClearAll: () => void;
}) {
  if (!chips.length) return null;

  return (
    <div
      className="flex max-w-full flex-wrap items-center gap-2 overflow-x-clip"
      aria-label="Active hotel filters"
    >
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-indigo-950 transition-colors hover:border-violet-300 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
          onClick={() => onRemove(chip)}
          aria-label={`Remove ${chip.label} filter`}
        >
          <span className="truncate">{chip.label}</span>
          <span
            aria-hidden="true"
            className="text-sm leading-none text-violet-700"
          >
            ×
          </span>
        </button>
      ))}
      <button
        type="button"
        className="rounded-full px-1.5 py-1 text-xs font-bold text-violet-700 transition-colors hover:text-violet-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
        onClick={onClearAll}
      >
        Clear all
      </button>
    </div>
  );
}

function HotelFilters({
  maxPrice,
  setMaxPrice,
  resultMaxPrice,
  priceCurrency,
  minRating,
  setMinRating,
  options,
  selectedFilters,
  toggleFilter,
}: {
  maxPrice: number;
  setMaxPrice: (value: number) => void;
  resultMaxPrice: number;
  priceCurrency: string;
  minRating: number;
  setMinRating: (value: number) => void;
  options: ReturnType<typeof buildHotelFilterOptions>;
  selectedFilters: HotelFilterSelections;
  toggleFilter: (group: keyof HotelFilterSelections, value: string) => void;
}) {
  const filterRangeClass =
    "h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 outline-none transition disabled:cursor-not-allowed disabled:opacity-60 [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-gradient-to-r [&::-webkit-slider-runnable-track]:from-indigo-600 [&::-webkit-slider-runnable-track]:to-violet-500 [&::-webkit-slider-thumb]:mt-[-4px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-violet-600 [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-slate-200 [&::-moz-range-progress]:h-2 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-violet-600 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-violet-600 [&::-moz-range-thumb]:shadow-md";

  return (
    <div className="bg-white">
      <div className="flex items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-indigo-700 to-violet-600 px-3 py-3">
        <div>
          <h2 className="text-base font-bold text-white">Filter by</h2>
        </div>
        <SlidersHorizontal className="text-white/90" size={18} />
      </div>

      <div className="space-y-4 bg-white px-3 py-3">
        <FilterSection title="Budget / Price">
          <label className="block">
            <span className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-muted">
              Total up to{" "}
              <span className="font-mono text-indigo-950">
                {formatCurrency(maxPrice, priceCurrency)}
              </span>
            </span>
            <input
              className={filterRangeClass}
              type="range"
              min={100}
              max={Math.max(resultMaxPrice, 300)}
              step={25}
              value={maxPrice}
              onChange={(event) => setMaxPrice(Number(event.target.value))}
            />
          </label>
        </FilterSection>

        <CheckboxFilterSection
          title="Popular Filters"
          options={options.popular}
          selected={selectedFilters.popular}
          onToggle={(value) => toggleFilter("popular", value)}
        />

        <FilterSection title="Star Rating">
          <label className="block">
            <span className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-muted">
              From{" "}
              <span className="font-mono text-indigo-950">{minRating}+</span>
            </span>
            <input
              className={filterRangeClass}
              type="range"
              min={1}
              max={5}
              step={0.5}
              value={minRating}
              onChange={(event) => setMinRating(Number(event.target.value))}
            />
          </label>
        </FilterSection>

        <CheckboxFilterSection
          title="Location / Area"
          options={options.locations}
          selected={selectedFilters.locations}
          onToggle={(value) => toggleFilter("locations", value)}
          collapsedCount={5}
        />

        <CheckboxFilterSection
          title="Property Type"
          options={options.propertyTypes}
          selected={selectedFilters.propertyTypes}
          onToggle={(value) => toggleFilter("propertyTypes", value)}
        />

        <CheckboxFilterSection
          title="Room Type"
          options={options.roomTypes}
          selected={selectedFilters.roomTypes}
          onToggle={(value) => toggleFilter("roomTypes", value)}
          collapsedCount={5}
        />

        <CheckboxFilterSection
          title="Bed Type"
          options={options.bedTypes}
          selected={selectedFilters.bedTypes}
          onToggle={(value) => toggleFilter("bedTypes", value)}
          collapsedCount={5}
        />

        <CheckboxFilterSection
          title="Meals"
          options={options.meals}
          selected={selectedFilters.meals}
          onToggle={(value) => toggleFilter("meals", value)}
        />

        <CheckboxFilterSection
          title="Cancellation Policy"
          options={options.cancellationPolicies}
          selected={selectedFilters.cancellationPolicies}
          onToggle={(value) => toggleFilter("cancellationPolicies", value)}
        />

        <CheckboxFilterSection
          title="Facilities"
          options={options.facilities}
          selected={selectedFilters.facilities}
          onToggle={(value) => toggleFilter("facilities", value)}
          collapsedCount={6}
        />
      </div>
    </div>
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-slate-200/70 pt-3 first:border-t-0 first:pt-0">
      <h3 className="mb-1.5 text-[13px] font-semibold leading-5 text-slate-800">
        {title}
      </h3>
      <div className="grid gap-1">{children}</div>
    </section>
  );
}

function CheckboxFilterSection({
  title,
  options,
  selected,
  onToggle,
  collapsedCount = 4,
}: {
  title: string;
  options: FilterOption[];
  selected: string[];
  onToggle: (value: string) => void;
  collapsedCount?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!options.length) return null;

  const visibleOptions = expanded ? options : options.slice(0, collapsedCount);
  const hasMore = options.length > collapsedCount;

  return (
    <FilterSection title={title}>
      <div className="grid gap-1">
        {visibleOptions.map((option) => {
          const checked = selected.includes(option.value);

          return (
            <label
              key={option.value}
              className="flex cursor-pointer items-start justify-between gap-3 py-1.5 text-[13px] font-medium text-slate-700 transition hover:text-slate-950"
            >
              <span className="flex min-w-0 items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300 accent-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                  checked={checked}
                  onChange={() => onToggle(option.value)}
                />
                <span
                  className={cn(
                    "min-w-0 truncate",
                    checked ? "font-semibold text-slate-950" : undefined,
                  )}
                >
                  {option.label}
                </span>
              </span>
              <span className="shrink-0 text-xs font-medium text-slate-500">
                {option.count}
              </span>
            </label>
          );
        })}
      </div>

      {hasMore ? (
        <button
          type="button"
          className="mt-2 text-xs font-semibold text-indigo-700 transition-colors hover:text-indigo-900"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded
            ? "Show less"
            : `Show more (${options.length - collapsedCount})`}
        </button>
      ) : null}
    </FilterSection>
  );
}

function buildActiveFilterChips(
  selectedFilters: HotelFilterSelections,
  maxPrice: number,
  resultMaxPrice: number,
  minRating: number,
  priceCurrency: string,
): ActiveHotelFilterChip[] {
  const filterGroups: Array<{
    group: keyof HotelFilterSelections;
    filters: TermFilter[];
  }> = [
    { group: "popular", filters: POPULAR_FILTERS },
    { group: "propertyTypes", filters: PROPERTY_TYPE_FILTERS },
    { group: "meals", filters: MEAL_FILTERS },
    { group: "cancellationPolicies", filters: CANCELLATION_FILTERS },
    { group: "facilities", filters: FACILITY_FILTERS },
    { group: "locations", filters: LOCATION_AREA_FILTERS },
    { group: "roomTypes", filters: ROOM_TYPE_FILTERS },
    { group: "bedTypes", filters: BED_TYPE_FILTERS },
  ];

  const chips: ActiveHotelFilterChip[] = filterGroups.flatMap(
    ({ group, filters }) =>
      selectedFilters[group].map((value) => {
        const filter = filters.find((item) => item.value === value);

        return {
          key: `${group}-${value}`,
          label: filter?.label ?? value,
          group,
          value,
        };
      }),
  );

  if (maxPrice < resultMaxPrice) {
    chips.push({
      key: "maxPrice",
      label: `Up to ${formatCurrency(maxPrice, priceCurrency)}`,
      kind: "maxPrice",
    });
  }

  if (minRating > DEFAULT_MIN_RATING) {
    chips.push({
      key: "minRating",
      label: `${minRating}+ stars`,
      kind: "minRating",
    });
  }

  return chips;
}

function buildHotelFilterOptions(hotels: PublicHotelResult[]) {
  return {
    popular: buildTermOptions(hotels, POPULAR_FILTERS, getSearchableHotelText),
    propertyTypes: buildTermOptions(hotels, PROPERTY_TYPE_FILTERS, (hotel) =>
      [hotel.name, hotel.roomType].join(" "),
    ),
    meals: buildTermOptions(hotels, MEAL_FILTERS, getSearchableHotelText),
    cancellationPolicies: buildTermOptions(
      hotels,
      CANCELLATION_FILTERS,
      (hotel) => [hotel.cancellationInfo, ...hotel.amenities].join(" "),
    ),
    facilities: buildTermOptions(hotels, FACILITY_FILTERS, (hotel) =>
      hotel.amenities.join(" "),
    ),
    locations: buildTermOptions(hotels, LOCATION_AREA_FILTERS, (hotel) =>
      [hotel.location, hotel.distanceFromCenter, ...hotel.amenities].join(" "),
    ),
    roomTypes: buildTermOptions(
      hotels,
      ROOM_TYPE_FILTERS,
      (hotel) => hotel.roomType,
    ),
    bedTypes: buildTermOptions(
      hotels,
      BED_TYPE_FILTERS,
      (hotel) => hotel.roomType,
    ),
  };
}

function buildTermOptions(
  hotels: PublicHotelResult[],
  filters: TermFilter[],
  textForHotel: (hotel: PublicHotelResult) => string,
) {
  return filters
    .map((filter) => ({
      value: filter.value,
      label: filter.label,
      count: hotels.filter((hotel) =>
        textIncludesTerms(textForHotel(hotel), filter.terms),
      ).length,
    }))
    .filter((option) => option.count > 0 && option.count < hotels.length)
    .sort(
      (first, second) =>
        second.count - first.count || first.label.localeCompare(second.label),
    );
}

function hotelMatchesFilters(
  hotel: PublicHotelResult,
  maxPrice: number,
  minRating: number,
  selectedFilters: HotelFilterSelections,
) {
  return (
    hotel.totalPrice <= maxPrice &&
    hotel.rating >= minRating &&
    matchesTermGroup(
      hotel,
      selectedFilters.popular,
      POPULAR_FILTERS,
      getSearchableHotelText,
    ) &&
    matchesTermGroup(
      hotel,
      selectedFilters.propertyTypes,
      PROPERTY_TYPE_FILTERS,
      (item) => [item.name, item.roomType].join(" "),
    ) &&
    matchesTermGroup(
      hotel,
      selectedFilters.meals,
      MEAL_FILTERS,
      getSearchableHotelText,
    ) &&
    matchesTermGroup(
      hotel,
      selectedFilters.cancellationPolicies,
      CANCELLATION_FILTERS,
      (item) => [item.cancellationInfo, ...item.amenities].join(" "),
    ) &&
    matchesTermGroup(
      hotel,
      selectedFilters.facilities,
      FACILITY_FILTERS,
      (item) => item.amenities.join(" "),
    ) &&
    matchesTermGroup(
      hotel,
      selectedFilters.locations,
      LOCATION_AREA_FILTERS,
      (item) =>
        [item.location, item.distanceFromCenter, ...item.amenities].join(" "),
    ) &&
    matchesTermGroup(
      hotel,
      selectedFilters.roomTypes,
      ROOM_TYPE_FILTERS,
      (item) => item.roomType,
    ) &&
    matchesTermGroup(
      hotel,
      selectedFilters.bedTypes,
      BED_TYPE_FILTERS,
      (item) => item.roomType,
    )
  );
}

function matchesTermGroup(
  hotel: PublicHotelResult,
  selectedValues: string[],
  filters: TermFilter[],
  textForHotel: (hotel: PublicHotelResult) => string,
) {
  if (!selectedValues.length) return true;

  return selectedValues.some((value) => {
    const filter = filters.find((item) => item.value === value);
    return filter
      ? textIncludesTerms(textForHotel(hotel), filter.terms)
      : false;
  });
}

function getSearchableHotelText(hotel: PublicHotelResult) {
  return [
    hotel.name,
    hotel.location,
    hotel.roomType,
    hotel.cancellationInfo,
    ...hotel.amenities,
  ].join(" ");
}

function textIncludesTerms(text: string, terms: string[]) {
  const normalizedText = text.toLowerCase();
  return terms.some((term) => normalizedText.includes(term));
}

function HotelSkeleton() {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-[0_16px_40px_-24px_rgba(30,27,75,0.45)]">
      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <Skeleton className="aspect-[16/10] md:aspect-auto md:min-h-[236px]" />
        <div className="space-y-3">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </div>
  );
}

function nextDate(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}
