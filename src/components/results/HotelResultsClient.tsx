"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";

import type { PublicHotelResult } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { HotelCard } from "@/components/results/HotelCard";
import { HotelSearchBar } from "@/components/search/HotelSearchBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn, formatCurrency } from "@/lib/utils";

const hotelResultStackClass = "w-full max-w-[704px] lg:ml-4 xl:ml-6";

const FILTER_APPLYING_DELAY_MS = 700;

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

const getResultMaxPrice = (hotels: PublicHotelResult[]) =>
  Math.max(
    300,
    Math.ceil(Math.max(...hotels.map((hotel) => hotel.totalPrice), 300) / 100) *
      100,
  );

export function HotelResultsClient() {
  const params = useSearchParams();

  const [results, setResults] = useState<PublicHotelResult[]>([]);
  const [visibleFiltered, setVisibleFiltered] = useState<PublicHotelResult[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messageIndex, setMessageIndex] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterApplying, setFilterApplying] = useState(false);
  const [maxPrice, setMaxPrice] = useState(1200);
  const [minRating, setMinRating] = useState(3);
  const [selectedFilters, setSelectedFilters] =
    useState<HotelFilterSelections>(emptySelections);

  const filterApplyingTimeoutRef = useRef<number | null>(null);

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

  const displayedHotels = filterApplying ? visibleFiltered : filtered;

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
    };
  }, []);

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
    setMinRating(3);
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

  return (
    <main className="flex-1 bg-[#f6f8fb] pb-8 pt-6 sm:pt-8 lg:pt-8">
      <div className="page-shell grid gap-5 py-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <section className="lg:col-span-2">
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
          />

          <Button
            variant="secondary"
            className="mt-2 w-fit md:hidden"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal size={17} />
            Filters
          </Button>
        </section>

        <aside className="hidden lg:block">
          <HotelFilters
            maxPrice={maxPrice}
            setMaxPrice={updateMaxPrice}
            resultMaxPrice={resultMaxPrice}
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
            <div className={hotelResultStackClass}>
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
            <div
              className={cn(hotelResultStackClass, "min-h-[360px] space-y-4")}
            >
              <div className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-bold text-navy">
                  {displayedHotels.length} stay option
                  {displayedHotels.length === 1 ? "" : "s"} found
                </p>
              </div>

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
              ) : displayedHotels.length ? (
                displayedHotels.map((hotel) => (
                  <HotelCard key={hotel.id} hotel={hotel} />
                ))
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm font-semibold text-muted shadow-sm">
                  No stays match these filters. Widen your filters to see more
                  available options.
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-50 bg-indigo-950/45 lg:hidden",
          filtersOpen ? "block" : "hidden",
        )}
        onClick={() => setFiltersOpen(false)}
      />

      <aside
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 max-h-[86dvh] overflow-auto rounded-t-3xl bg-white p-5 shadow-2xl transition-transform lg:hidden",
          filtersOpen ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-indigo-950">Filters</h2>
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
          minRating={minRating}
          setMinRating={updateMinRating}
          options={filterOptions}
          selectedFilters={selectedFilters}
          toggleFilter={toggleFilter}
        />
      </aside>
    </main>
  );
}

function HotelFilters({
  maxPrice,
  setMaxPrice,
  resultMaxPrice,
  minRating,
  setMinRating,
  options,
  selectedFilters,
  toggleFilter,
}: {
  maxPrice: number;
  setMaxPrice: (value: number) => void;
  resultMaxPrice: number;
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
                {formatCurrency(maxPrice)}
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
    return filter ? textIncludesTerms(textForHotel(hotel), filter.terms) : false;
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