"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import type { PublicHotelResult } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { HotelCard } from "@/components/results/HotelCard";
import { HotelSearchBar } from "@/components/search/HotelSearchBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn, formatCurrency } from "@/lib/utils";

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
  { value: "free-cancellation", label: "Free cancellation", terms: ["free cancellation"] },
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
    terms: ["city centre", "city center", "central", "downtown", "centre", "center"],
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
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messageIndex, setMessageIndex] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [maxPrice, setMaxPrice] = useState(1200);
  const [minRating, setMinRating] = useState(3);
  const [selectedFilters, setSelectedFilters] =
    useState<HotelFilterSelections>(emptySelections);
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
        if (!response.ok)
          throw new Error(data.error || "Unable to search hotels.");
        return data as { results: PublicHotelResult[]; warnings?: string[] };
      })
      .then((data) => {
        if (!active) return;
        setResults(data.results);
        setWarnings(data.warnings || []);
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

  const filterOptions = useMemo(() => buildHotelFilterOptions(results), [results]);
  const filtered = useMemo(
    () =>
      results.filter((hotel) =>
        hotelMatchesFilters(hotel, maxPrice, minRating, selectedFilters),
      ),
    [maxPrice, minRating, results, selectedFilters],
  );
  const resultMaxPrice = useMemo(() => getResultMaxPrice(results), [results]);
  const showFilteredEmptyState =
    !loading && !error && results.length > 0 && filtered.length === 0;

  const resetFilters = () => {
    setMaxPrice(resultMaxPrice);
    setMinRating(3);
    setSelectedFilters(emptySelections);
    setFiltersOpen(false);
  };

  const toggleFilter = (group: keyof HotelFilterSelections, value: string) => {
    setSelectedFilters((current) => ({
      ...current,
      [group]: current[group].includes(value)
        ? current[group].filter((item) => item !== value)
        : [...current[group], value],
    }));
  };

  return (
    <main className="flex-1 pb-8">
      <div className="sticky top-0 z-40 border-b border-border bg-white shadow-[0_12px_32px_-28px_rgba(15,23,42,0.45)]">
        <div className="page-shell py-2">
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
        </div>
      </div>

      <div className="page-shell grid gap-4 py-4 lg:grid-cols-[290px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <HotelFilters
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            resultMaxPrice={resultMaxPrice}
            minRating={minRating}
            setMinRating={setMinRating}
            options={filterOptions}
            selectedFilters={selectedFilters}
            toggleFilter={toggleFilter}
          />
        </aside>
        <section className="min-w-0 space-y-3">
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
            <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-[0_16px_40px_-24px_rgba(30,27,75,0.45)]">
              <p className="text-lg font-bold text-indigo-950">
                No stays match these filters
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Try increasing the price range, lowering the star rating, or
                clearing selected hotel filters to see more available options.
              </p>
              <Button variant="secondary" className="mt-4" onClick={resetFilters}>
                Reset filters
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-white px-3.5 py-2 shadow-[0_12px_30px_-24px_rgba(30,27,75,0.45)]">
                <p className="text-sm font-semibold text-muted">
                  {filtered.length} stay option{filtered.length === 1 ? "" : "s"}{" "}
                  found
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
          maxPrice={maxPrice}
          setMaxPrice={setMaxPrice}
          resultMaxPrice={resultMaxPrice}
          minRating={minRating}
          setMinRating={setMinRating}
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
  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-[0_16px_40px_-24px_rgba(30,27,75,0.45)] lg:sticky lg:top-24 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
      <h2 className="text-base font-bold text-indigo-950">Filters</h2>
      <div className="mt-4 divide-y divide-indigo-100">
        <FilterSection title="Budget / price">
          <label className="block">
            <span className="mb-2 flex items-center justify-between text-sm font-semibold text-muted">
              Total up to{" "}
              <span className="font-mono text-indigo-950">
                {formatCurrency(maxPrice)}
              </span>
            </span>
            <input
              className="w-full accent-violet-600"
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
          title="Popular filters"
          options={options.popular}
          selected={selectedFilters.popular}
          onToggle={(value) => toggleFilter("popular", value)}
        />

        <FilterSection title="Star rating">
          <label className="block">
            <span className="mb-2 flex items-center justify-between text-sm font-semibold text-muted">
              From{" "}
              <span className="font-mono text-indigo-950">{minRating}+</span>
            </span>
            <input
              className="w-full accent-violet-600"
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
          title="Location / area"
          options={options.locations}
          selected={selectedFilters.locations}
          onToggle={(value) => toggleFilter("locations", value)}
          collapsedCount={5}
        />

        <CheckboxFilterSection
          title="Property type"
          options={options.propertyTypes}
          selected={selectedFilters.propertyTypes}
          onToggle={(value) => toggleFilter("propertyTypes", value)}
        />

        <CheckboxFilterSection
          title="Room type"
          options={options.roomTypes}
          selected={selectedFilters.roomTypes}
          onToggle={(value) => toggleFilter("roomTypes", value)}
          collapsedCount={5}
        />

        <CheckboxFilterSection
          title="Bed type"
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
          title="Cancellation policy"
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
  children: React.ReactNode;
}) {
  return (
    <section className="py-4 first:pt-0 last:pb-0">
      <h3 className="mb-3 text-sm font-bold text-indigo-950">{title}</h3>
      {children}
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
      <div className="grid gap-2">
        {visibleOptions.map((option) => {
          const checked = selected.includes(option.value);
          return (
            <label
              key={option.value}
              className={cn(
                "grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-2 text-sm",
                checked ? "font-semibold text-violet-700" : "text-muted",
              )}
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-indigo-200 accent-violet-600"
                checked={checked}
                onChange={() => onToggle(option.value)}
              />
              <span className="min-w-0 truncate">{option.label}</span>
              <span className="text-xs font-semibold text-muted/70">
                {option.count}
              </span>
            </label>
          );
        })}
      </div>
      {hasMore ? (
        <button
          type="button"
          className="mt-3 text-xs font-bold text-violet-700 hover:text-violet-800"
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
    cancellationPolicies: buildTermOptions(hotels, CANCELLATION_FILTERS, (hotel) =>
      [hotel.cancellationInfo, ...hotel.amenities].join(" "),
    ),
    facilities: buildTermOptions(hotels, FACILITY_FILTERS, (hotel) =>
      hotel.amenities.join(" "),
    ),
    locations: buildTermOptions(hotels, LOCATION_AREA_FILTERS, (hotel) =>
      [hotel.location, hotel.distanceFromCenter, ...hotel.amenities].join(" "),
    ),
    roomTypes: buildTermOptions(hotels, ROOM_TYPE_FILTERS, (hotel) =>
      hotel.roomType,
    ),
    bedTypes: buildTermOptions(hotels, BED_TYPE_FILTERS, (hotel) =>
      hotel.roomType,
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
      (item) => [item.location, item.distanceFromCenter, ...item.amenities].join(" "),
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
