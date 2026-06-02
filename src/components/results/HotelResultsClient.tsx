"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ChevronDown,
  Hotel,
  Info,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { PublicHotelResult } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { HotelCard } from "@/components/results/HotelCard";
import { HotelSearchBar } from "@/components/search/HotelSearchBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn, formatCurrency } from "@/lib/utils";

const messages = [
  "Searching trusted hotel partners...",
  "Comparing total stay prices...",
  "Checking room details and provider terms...",
  "Finding easy-to-compare stays...",
];

const getResultMaxPrice = (hotels: PublicHotelResult[]) =>
  Math.max(
    300,
    Math.ceil(
      Math.max(...hotels.map((hotel) => hotel.pricePerNight), 300) / 50,
    ) * 50,
  );

type HotelFiltersState = {
  maxNightlyPrice: number;
  starRatings: string[];
  guestRatings: string[];
  propertyTypes: string[];
  amenities: string[];
  roomFacilities: string[];
  locations: string[];
  meals: string[];
  bedTypes: string[];
  paymentOptions: string[];
  bookingPolicies: string[];
  popular: string[];
};

type FilterGroupKey = keyof Omit<HotelFiltersState, "maxNightlyPrice">;

type FilterOption = {
  label: string;
  value: string;
  count: number;
  matcher: (hotel: PublicHotelResult) => boolean;
};

type FilterGroup = {
  key: FilterGroupKey;
  title: string;
  control: "checkbox" | "radio";
  options: FilterOption[];
};

const defaultFilters = (maxNightlyPrice: number): HotelFiltersState => ({
  maxNightlyPrice,
  starRatings: [],
  guestRatings: [],
  propertyTypes: [],
  amenities: [],
  roomFacilities: [],
  locations: [],
  meals: [],
  bedTypes: [],
  paymentOptions: [],
  bookingPolicies: [],
  popular: [],
});

export function HotelResultsClient() {
  const params = useSearchParams();
  const [results, setResults] = useState<PublicHotelResult[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messageIndex, setMessageIndex] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<HotelFiltersState>(() =>
    defaultFilters(1200),
  );
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
            "Live hotel search is temporarily unavailable because Kurioticket is not connected to an approved live hotel provider for this search. We won’t show placeholder stays or unverified prices. Please try again later or start a new search.",
          );
        }
        if (!response.ok)
          throw new Error(data.error || "Unable to search hotels.");
        return data as { results: PublicHotelResult[]; warnings?: string[] };
      })
      .then((data) => {
        if (!active) return;
        const nextMaxPrice = getResultMaxPrice(data.results);
        setResults(data.results);
        setWarnings(data.warnings || []);
        setFilters(defaultFilters(nextMaxPrice));
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

  const nights = getNightCount(body.checkIn, body.checkOut);
  const resultMaxPrice = useMemo(() => getResultMaxPrice(results), [results]);
  const filterGroups = useMemo(() => buildFilterGroups(results), [results]);
  const activeFilterCount = getActiveFilterCount(filters, resultMaxPrice);
  const filtered = useMemo(
    () => applyHotelFilters(results, filters, filterGroups),
    [results, filters, filterGroups],
  );
  const showFilteredEmptyState =
    !loading && !error && results.length > 0 && filtered.length === 0;
  const showNoResultsState = !loading && !error && results.length === 0;

  const resetFilters = () => {
    setFilters(defaultFilters(resultMaxPrice));
    setFiltersOpen(false);
  };

  return (
    <main className="flex-1 bg-gradient-to-b from-violet-50/55 via-white to-white pb-8 pt-5 sm:pt-7 lg:pt-8">
      <div className="sticky top-16 z-30 border-b border-indigo-100 bg-white/95 backdrop-blur">
        <div className="page-shell py-3">
          <HotelSearchBar
            key={`${body.destination}-${body.checkIn}-${body.checkOut}-${body.guests}-${body.rooms}-${body.sort}`}
            initialDestination={body.destination}
            initialCheckIn={body.checkIn}
            initialCheckOut={body.checkOut}
            initialGuests={body.guests}
            initialRooms={body.rooms}
            initialSort={body.sort}
            errorRole="alert"
          />
          <Button
            variant="secondary"
            className="mt-3 w-full rounded-xl border-indigo-100 lg:hidden"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal size={17} />
            Filters
            {activeFilterCount ? (
              <span className="ml-1 rounded-full bg-violet-700 px-2 py-0.5 text-xs text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </Button>
        </div>
      </div>

      <div className="page-shell grid gap-6 py-6 lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr]">
        <aside className="hidden lg:block">
          <HotelFilters
            filters={filters}
            groups={filterGroups}
            resultMaxPrice={resultMaxPrice}
            activeFilterCount={activeFilterCount}
            onFiltersChange={setFilters}
            onReset={resetFilters}
          />
        </aside>
        <section className="min-w-0 space-y-5">
          <div className="rounded-3xl border border-indigo-100 bg-white/90 p-5 shadow-[0_18px_55px_-34px_rgba(67,56,202,0.55)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-violet-800">
                  <Hotel size={14} />
                  Hotel comparison
                </div>
                <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-indigo-950 sm:text-3xl">
                  Stays in {body.destination}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Compare hotel prices, amenities, and provider details in one
                  place. Kurioticket may redirect you to a hotel provider to
                  review final availability and complete booking.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center md:min-w-[260px]">
                <SummaryStat label="Nights" value={String(nights)} />
                <SummaryStat label="Guests" value={String(body.guests)} />
                <SummaryStat label="Rooms" value={String(body.rooms)} />
              </div>
            </div>
          </div>

          {!loading && !error && warnings.length ? (
            <div className="flex items-start gap-3 rounded-2xl border border-amber/30 bg-amber/10 p-4 text-sm leading-6 text-amber">
              <Info size={18} className="mt-0.5 shrink-0" />
              <span>
                Some provider checks may be limited for this hotel search.
                Review final availability, taxes, fees, and cancellation rules
                with the provider before booking.
              </span>
            </div>
          ) : null}

          {loading ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-white p-4 text-sm font-semibold text-violet-700 shadow-sm">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-violet-600" />
                {messages[messageIndex]}
              </div>
              <HotelSkeleton />
              <HotelSkeleton />
              <HotelSkeleton />
            </div>
          ) : error ? (
            <EmptyPanel
              icon={<AlertCircle size={22} />}
              title="Hotel search is temporarily unavailable"
              body={error}
              actionLabel="Try this search again"
              onAction={() => window.location.reload()}
            />
          ) : showNoResultsState ? (
            <EmptyPanel
              icon={<Hotel size={22} />}
              title="No hotel deals found"
              body="We could not find verified hotel options for this search. Try adjusting your destination, dates, guests, or rooms."
            />
          ) : showFilteredEmptyState ? (
            <EmptyPanel
              icon={<SlidersHorizontal size={22} />}
              title="No stays match these filters"
              body="Try increasing the price range or lowering the rating filter to see more available hotel options."
              actionLabel="Reset filters"
              onAction={resetFilters}
            />
          ) : (
            <>
              <div className="flex flex-col gap-2 rounded-2xl border border-indigo-100 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-bold text-indigo-950">
                  {filtered.length} stay option
                  {filtered.length === 1 ? "" : "s"} found
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  Sorted by {getSortLabel(body.sort)}
                </p>
              </div>
              {filtered.map((hotel) => (
                <HotelCard key={hotel.id} hotel={hotel} />
              ))}
            </>
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
          filters={filters}
          groups={filterGroups}
          resultMaxPrice={resultMaxPrice}
          activeFilterCount={activeFilterCount}
          onFiltersChange={setFilters}
          onReset={resetFilters}
        />
      </aside>
    </main>
  );
}

function HotelFilters({
  filters,
  groups,
  resultMaxPrice,
  activeFilterCount,
  onFiltersChange,
  onReset,
}: {
  filters: HotelFiltersState;
  groups: FilterGroup[];
  resultMaxPrice: number;
  activeFilterCount: number;
  onFiltersChange: (filters: HotelFiltersState) => void;
  onReset: () => void;
}) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );

  const toggleOption = (group: FilterGroup, value: string) => {
    const selectedValues = filters[group.key];
    const nextValues =
      group.control === "radio"
        ? selectedValues.includes(value)
          ? []
          : [value]
        : selectedValues.includes(value)
          ? selectedValues.filter((selected) => selected !== value)
          : [...selectedValues, value];

    onFiltersChange({ ...filters, [group.key]: nextValues });
  };

  return (
    <div className="rounded-3xl border border-indigo-100 bg-white shadow-[0_20px_65px_-38px_rgba(67,56,202,0.65)] lg:sticky lg:top-40 lg:max-h-[calc(100dvh-11rem)] lg:overflow-auto">
      <div className="sticky top-0 z-10 border-b border-indigo-100 bg-white/95 p-5 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-indigo-950">
              Filter by
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Narrow the current hotel results with available stay details.
            </p>
          </div>
          {activeFilterCount ? (
            <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-extrabold text-violet-800">
              {activeFilterCount}
            </span>
          ) : null}
        </div>
        {activeFilterCount ? (
          <Button
            variant="ghost"
            className="mt-4 h-9 w-full rounded-xl border border-violet-100 text-violet-700 hover:bg-violet-50"
            onClick={onReset}
          >
            Reset filters
          </Button>
        ) : null}
      </div>

      <div className="space-y-1 p-5 pt-4">
        <section className="border-b border-slate-100 pb-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-extrabold text-indigo-950">
              Budget / price per night
            </h3>
            <span className="font-mono text-sm font-extrabold text-violet-700">
              {formatCurrency(filters.maxNightlyPrice)}
            </span>
          </div>
          <input
            className="mt-4 w-full accent-violet-700"
            type="range"
            min={50}
            max={Math.max(resultMaxPrice, 50)}
            step={25}
            value={Math.min(
              filters.maxNightlyPrice,
              Math.max(resultMaxPrice, 50),
            )}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                maxNightlyPrice: Number(event.target.value),
              })
            }
          />
          <div className="mt-2 flex justify-between text-[11px] font-semibold text-slate-500">
            <span>{formatCurrency(50)}</span>
            <span>{formatCurrency(resultMaxPrice)}+</span>
          </div>
        </section>

        {groups.map((group) => {
          const isExpanded = expandedGroups[group.key];
          const visibleOptions = isExpanded
            ? group.options
            : group.options.slice(0, 5);
          const hasMore = group.options.length > 5;

          return (
            <section
              key={group.key}
              className="border-b border-slate-100 py-5 last:border-b-0 last:pb-0"
            >
              <h3 className="text-sm font-extrabold text-indigo-950">
                {group.title}
              </h3>
              <div className="mt-3 space-y-2">
                {visibleOptions.map((option) => {
                  const checked = filters[group.key].includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition",
                        checked
                          ? "border-violet-200 bg-violet-50/80 text-indigo-950 shadow-sm"
                          : "border-transparent text-slate-600 hover:border-violet-100 hover:bg-violet-50/45",
                      )}
                    >
                      <input
                        type={group.control}
                        name={`hotel-filter-${group.key}`}
                        className="h-4 w-4 shrink-0 accent-violet-700"
                        checked={checked}
                        onChange={() => toggleOption(group, option.value)}
                      />
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate",
                          checked && "font-bold text-indigo-950",
                        )}
                      >
                        {option.label}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-bold",
                          checked
                            ? "bg-white text-violet-700"
                            : "bg-slate-100 text-slate-500",
                        )}
                      >
                        {option.count}
                      </span>
                    </label>
                  );
                })}
              </div>
              {hasMore ? (
                <button
                  type="button"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-violet-700 hover:text-violet-900"
                  onClick={() =>
                    setExpandedGroups((current) => ({
                      ...current,
                      [group.key]: !isExpanded,
                    }))
                  }
                >
                  {isExpanded
                    ? "Show less"
                    : `Show more (${group.options.length - 5})`}
                  <ChevronDown
                    size={14}
                    className={cn(
                      "transition-transform",
                      isExpanded && "rotate-180",
                    )}
                  />
                </button>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function buildFilterGroups(hotels: PublicHotelResult[]): FilterGroup[] {
  const groups: FilterGroup[] = [
    createPopularFilters(hotels),
    createPropertyTypeFilters(hotels),
    createStarRatingFilters(hotels),
    createGuestRatingFilters(hotels),
    createAmenityFilters(
      hotels,
      "amenities",
      "Property facilities",
      (hotel) => hotel.amenities,
    ),
    createAmenityFilters(
      hotels,
      "roomFacilities",
      "Room facilities",
      (hotel) => [hotel.roomType, ...hotel.amenities],
    ),
    createTextFilters(hotels, "locations", "Location / area", (hotel) => [
      hotel.location,
      hotel.distanceFromCenter,
    ]),
    createMealFilters(hotels),
    createBedTypeFilters(hotels),
    createPaymentFilters(hotels),
    createBookingPolicyFilters(hotels),
  ];

  return groups.filter((group) => group.options.length > 0);
}

function createPopularFilters(hotels: PublicHotelResult[]): FilterGroup {
  const definitions = [
    keywordOption("Free Wi-Fi", /wi-?fi|internet/i, (hotel) => hotel.amenities),
    keywordOption(
      "Breakfast included",
      /breakfast/i,
      (hotel) => hotel.amenities,
    ),
    keywordOption(
      "Free cancellation",
      /free cancellation|flexible cancellation|refundable/i,
      (hotel) => [hotel.cancellationInfo, ...hotel.amenities],
    ),
    keywordOption(
      "Late check-in",
      /late check-?in|24-hour|24 hour/i,
      (hotel) => hotel.amenities,
    ),
    keywordOption(
      "Airport or transit access",
      /airport|transit|shuttle/i,
      (hotel) => [hotel.distanceFromCenter, ...hotel.amenities],
    ),
  ];

  return {
    key: "popular",
    title: "Popular filters",
    control: "checkbox",
    options: withCounts(hotels, definitions),
  };
}

function createPropertyTypeFilters(hotels: PublicHotelResult[]): FilterGroup {
  const definitions = [
    keywordOption("Hotel", /hotel/i, (hotel) => [hotel.name]),
    keywordOption("Resort", /resort/i, (hotel) => [hotel.name]),
    keywordOption(
      "Apartment",
      /apartment|aparthotel|suite/i,
      (hotel) => [hotel.name, hotel.roomType],
    ),
    keywordOption("Inn", /inn/i, (hotel) => [hotel.name]),
    keywordOption("Hostel", /hostel/i, (hotel) => [hotel.name]),
    keywordOption("Villa", /villa/i, (hotel) => [hotel.name, hotel.roomType]),
  ];

  return {
    key: "propertyTypes",
    title: "Property type",
    control: "checkbox",
    options: withCounts(hotels, definitions),
  };
}

function createStarRatingFilters(hotels: PublicHotelResult[]): FilterGroup {
  const definitions = [5, 4, 3, 2].map((stars) => ({
    label: `${stars} stars`,
    value: String(stars),
    matcher: (hotel: PublicHotelResult) => Math.floor(hotel.rating) === stars,
  }));

  return {
    key: "starRatings",
    title: "Star rating",
    control: "checkbox",
    options: withCounts(hotels, definitions),
  };
}

function createGuestRatingFilters(hotels: PublicHotelResult[]): FilterGroup {
  const definitions = [4.5, 4, 3.5, 3].map((rating) => ({
    label: `${rating}+ excellent`,
    value: String(rating),
    matcher: (hotel: PublicHotelResult) => hotel.rating >= rating,
  }));

  return {
    key: "guestRatings",
    title: "Guest rating",
    control: "radio",
    options: withCounts(hotels, definitions),
  };
}

function createMealFilters(hotels: PublicHotelResult[]): FilterGroup {
  const definitions = [
    keywordOption("Breakfast", /breakfast/i, (hotel) => hotel.amenities),
    keywordOption("Half board", /half board/i, (hotel) => hotel.amenities),
    keywordOption("Full board", /full board/i, (hotel) => hotel.amenities),
    keywordOption("All inclusive", /all inclusive/i, (hotel) => hotel.amenities),
    keywordOption("Room only", /room only/i, (hotel) => hotel.amenities),
  ];

  return {
    key: "meals",
    title: "Meals",
    control: "checkbox",
    options: withCounts(hotels, definitions),
  };
}

function createBedTypeFilters(hotels: PublicHotelResult[]): FilterGroup {
  const definitions = [
    keywordOption("King bed", /king/i, (hotel) => [hotel.roomType]),
    keywordOption("Queen bed", /queen/i, (hotel) => [hotel.roomType]),
    keywordOption("Double bed", /double/i, (hotel) => [hotel.roomType]),
    keywordOption("Twin beds", /twin/i, (hotel) => [hotel.roomType]),
    keywordOption("Single bed", /single/i, (hotel) => [hotel.roomType]),
  ];

  return {
    key: "bedTypes",
    title: "Bed type",
    control: "checkbox",
    options: withCounts(hotels, definitions),
  };
}

function createPaymentFilters(hotels: PublicHotelResult[]): FilterGroup {
  const definitions = [
    keywordOption(
      "Pay at hotel",
      /pay at hotel|pay later|payment at/i,
      (hotel) => [hotel.cancellationInfo, ...hotel.amenities],
    ),
    keywordOption(
      "Prepay online",
      /prepay|prepaid|advance payment/i,
      (hotel) => [hotel.cancellationInfo, ...hotel.amenities],
    ),
  ];

  return {
    key: "paymentOptions",
    title: "Payment options",
    control: "checkbox",
    options: withCounts(hotels, definitions),
  };
}

function createBookingPolicyFilters(hotels: PublicHotelResult[]): FilterGroup {
  const definitions = [
    keywordOption(
      "Free cancellation",
      /free cancellation|flexible cancellation|refundable/i,
      (hotel) => [hotel.cancellationInfo, ...hotel.amenities],
    ),
    keywordOption(
      "Cancellation details available",
      /cancellation|policy/i,
      (hotel) => [hotel.cancellationInfo],
    ),
    keywordOption(
      "Confirm before booking",
      /confirm|provider|shown/i,
      (hotel) => [hotel.cancellationInfo],
    ),
  ];

  return {
    key: "bookingPolicies",
    title: "Booking policy",
    control: "checkbox",
    options: withCounts(hotels, definitions),
  };
}

function createAmenityFilters(
  hotels: PublicHotelResult[],
  key: FilterGroupKey,
  title: string,
  getValues: (hotel: PublicHotelResult) => Array<string | undefined>,
): FilterGroup {
  const counts = new Map<string, number>();
  for (const hotel of hotels) {
    const values = new Set(
      getValues(hotel)
        .filter(Boolean)
        .flatMap((value) => splitFilterText(value as string))
        .filter((value) => value.length >= 3),
    );
    values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  }

  return {
    key,
    title,
    control: "checkbox",
    options: [...counts.entries()]
      .map(([label, count]) => ({
        label,
        value: label,
        count,
        matcher: (hotel: PublicHotelResult) =>
          getValues(hotel).some((value) =>
            value?.toLowerCase().includes(label.toLowerCase()),
          ),
      }))
      .filter((option) => option.count > 0)
      .sort(sortByCountThenLabel),
  };
}

function createTextFilters(
  hotels: PublicHotelResult[],
  key: FilterGroupKey,
  title: string,
  getValues: (hotel: PublicHotelResult) => Array<string | undefined>,
): FilterGroup {
  const counts = new Map<string, number>();
  for (const hotel of hotels) {
    getValues(hotel)
      .filter(Boolean)
      .map((value) => (value as string).trim())
      .filter((value) => value.length > 1)
      .forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  }

  return {
    key,
    title,
    control: "checkbox",
    options: [...counts.entries()]
      .map(([label, count]) => ({
        label,
        value: label,
        count,
        matcher: (hotel: PublicHotelResult) =>
          getValues(hotel).some((value) => value === label),
      }))
      .filter((option) => option.count > 0)
      .sort(sortByCountThenLabel),
  };
}

function withCounts(
  hotels: PublicHotelResult[],
  options: Omit<FilterOption, "count">[],
): FilterOption[] {
  return options
    .map((option) => ({
      ...option,
      count: hotels.filter(option.matcher).length,
    }))
    .filter((option) => option.count > 0)
    .sort(sortByCountThenLabel);
}

function keywordOption(
  label: string,
  pattern: RegExp,
  getValues: (hotel: PublicHotelResult) => Array<string | undefined>,
): Omit<FilterOption, "count"> {
  return {
    label,
    value: label,
    matcher: (hotel) =>
      getValues(hotel).some((value) => Boolean(value && pattern.test(value))),
  };
}

function splitFilterText(value: string) {
  return value
    .split(/[,/•|]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function sortByCountThenLabel(a: FilterOption, b: FilterOption) {
  return b.count - a.count || a.label.localeCompare(b.label);
}

function applyHotelFilters(
  hotels: PublicHotelResult[],
  filters: HotelFiltersState,
  groups: FilterGroup[],
) {
  return hotels.filter((hotel) => {
    if (hotel.pricePerNight > filters.maxNightlyPrice) return false;

    return groups.every((group) => {
      const selected = filters[group.key];
      if (!selected.length) return true;
      const selectedOptions = group.options.filter((option) =>
        selected.includes(option.value),
      );
      return selectedOptions.some((option) => option.matcher(hotel));
    });
  });
}

function getActiveFilterCount(
  filters: HotelFiltersState,
  resultMaxPrice: number,
) {
  const selectedOptionCount = (
    Object.keys(filters) as Array<keyof HotelFiltersState>
  )
    .filter((key) => key !== "maxNightlyPrice")
    .reduce((count, key) => count + filters[key].length, 0);

  return (
    selectedOptionCount + (filters.maxNightlyPrice < resultMaxPrice ? 1 : 0)
  );
}


function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-violet-50 px-3 py-3 ring-1 ring-violet-100">
      <div className="text-xl font-extrabold text-indigo-950">{value}</div>
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>
    </div>
  );
}

function EmptyPanel({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-[0_18px_55px_-34px_rgba(67,56,202,0.55)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
        {icon}
      </div>
      <p className="mt-4 text-xl font-extrabold text-indigo-950">{title}</p>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{body}</p>
      {actionLabel && onAction ? (
        <Button
          variant="secondary"
          className="mt-5 rounded-xl border-indigo-100"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

function getSortLabel(sortMode: unknown) {
  if (sortMode === "best") return "best value";
  if (sortMode === "rating") return "top rated";
  if (sortMode === "location") return "location";
  return "lowest price";
}

function getNightCount(checkIn: string, checkOut: string) {
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  const nights = Math.round((end - start) / (1000 * 60 * 60 * 24));
  return Number.isFinite(nights) && nights > 0 ? nights : 1;
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
