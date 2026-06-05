"use client";

import { useState } from "react";
import {
  CalendarDays,
  Clock3,
  MapPin,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type CarsResultsValues = {
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;
  pickupTime: string;
  dropoffDate: string;
  dropoffTime: string;
  driverAge: string;
};

type SearchField = {
  label: string;
  value: string;
  icon: typeof MapPin;
};

type PendingFilterGroup = {
  title: string;
  description: string;
};

const defaultDriverAge = "18-70";
const driverAgeRangeLabel = "Any driver age 18–70";

const driverAgeOptions = [
  defaultDriverAge,
  ...Array.from({ length: 58 }, (_, index) => String(index + 18)),
];

const pendingFilterGroups: PendingFilterGroup[] = [
  {
    title: "Vehicle type",
    description: "Vehicle classes will load from live rental inventory.",
  },
  {
    title: "Rental company",
    description: "Rental company options will appear after providers connect.",
  },
  {
    title: "Transmission",
    description: "Transmission choices will be based on provider vehicles.",
  },
  {
    title: "Seats",
    description: "Seat capacity filters will unlock with vehicle details.",
  },
  {
    title: "Bags",
    description: "Luggage capacity filters will unlock with vehicle details.",
  },
  {
    title: "Mileage policy",
    description: "Mileage terms will display from provider rules.",
  },
  {
    title: "Fuel policy",
    description: "Fuel policy filters will display from provider rules.",
  },
  {
    title: "Cancellation",
    description: "Cancellation filters will display from provider terms.",
  },
  {
    title: "Pickup location type",
    description: "Airport, shuttle, and counter details will load from providers.",
  },
];

const displayValue = (value: string) => value || "Not selected";

const formatDate = (date: string) => {
  if (!date) {
    return "Not selected";
  }

  const [year, month, day] = date.split("-").map(Number);

  return year && month && day
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(year, month - 1, day))
    : date;
};

const formatDriverAge = (driverAge: string) => {
  if (!driverAge) {
    return driverAgeRangeLabel;
  }

  if (driverAge === defaultDriverAge || driverAge === "18–70") {
    return driverAgeRangeLabel;
  }

  const numericDriverAge = Number.parseInt(driverAge, 10);

  return !Number.isNaN(numericDriverAge) &&
    String(numericDriverAge) === driverAge
    ? `${numericDriverAge} years old`
    : driverAge;
};

const getDriverAgeOptionLabel = (age: string) =>
  age === defaultDriverAge ? driverAgeRangeLabel : `${age} years old`;

export function CarsResultsClient({ values }: { values: CarsResultsValues }) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const resolvedDropoffLocation = values.dropoffLocation || values.pickupLocation;
  const driverAge = values.driverAge || defaultDriverAge;

  const searchFields: SearchField[] = [
    {
      label: "Pickup location",
      value: displayValue(values.pickupLocation),
      icon: MapPin,
    },
    {
      label: "Return location",
      value: displayValue(resolvedDropoffLocation),
      icon: MapPin,
    },
    {
      label: "Rental dates",
      value:
        values.pickupDate || values.dropoffDate
          ? `${formatDate(values.pickupDate)} – ${formatDate(values.dropoffDate)}`
          : "Not selected",
      icon: CalendarDays,
    },
    {
      label: "Pickup / return time",
      value: `${displayValue(values.pickupTime)} – ${displayValue(values.dropoffTime)}`,
      icon: Clock3,
    },
    {
      label: "Driver age",
      value: formatDriverAge(driverAge),
      icon: Users,
    },
  ];

  return (
    <main className="flex-1 overflow-x-clip bg-[#f6f8fb] pb-8">
      <section
        className="sticky top-16 z-30 border-b border-slate-200/80 bg-[#f6f8fb]/95 py-3 shadow-sm shadow-slate-900/5 backdrop-blur"
        aria-labelledby="cars-results-heading"
      >
        <div className="page-shell">
          <div className="mb-2 flex items-center justify-between gap-3 lg:hidden">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">
              Car rental results
            </p>
            <Button
              type="button"
              variant="secondary"
              className="h-10 rounded-md border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Filters
            </Button>
          </div>

          <form action="/cars/results" method="get" className="min-w-0">
            <div className="border border-slate-200 bg-white p-1 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1.35fr)_minmax(0,1.35fr)_minmax(0,1.25fr)_minmax(7rem,0.72fr)_112px] lg:gap-0">
                <SearchInputCell
                  icon={MapPin}
                  label="Pickup location"
                  name="pickupLocation"
                  placeholder="Airport, city, or address"
                  value={values.pickupLocation}
                />
                <SearchInputCell
                  icon={MapPin}
                  label="Return location"
                  name="dropoffLocation"
                  placeholder="Same as pickup"
                  value={resolvedDropoffLocation}
                />
                <SearchDateCell
                  dropoffDate={values.dropoffDate}
                  pickupDate={values.pickupDate}
                />
                <SearchTimeCell
                  dropoffTime={values.dropoffTime}
                  pickupTime={values.pickupTime}
                />
                <div className="min-w-0 border-slate-200 px-3 py-2 lg:border-r">
                  <label
                    htmlFor="driverAge"
                    className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-500"
                  >
                    <Users className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" />
                    Driver age
                  </label>
                  <select
                    id="driverAge"
                    name="driverAge"
                    defaultValue={driverAge}
                    className="mt-1 h-8 w-full border-none bg-transparent p-0 text-[16px] font-semibold text-slate-950 focus:outline-none md:text-sm"
                  >
                    {driverAgeOptions.map((age) => (
                      <option key={age} value={age}>
                        {getDriverAgeOptionLabel(age)}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="focus-ring inline-flex min-h-12 w-full items-center justify-center gap-2 bg-gradient-to-r from-indigo-700 to-violet-600 px-4 text-sm font-bold text-white shadow-lg shadow-indigo-700/20 transition hover:from-indigo-600 hover:to-violet-500 lg:min-h-[58px]"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Search
                </button>
              </div>
            </div>
          </form>

          <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-5">
            {searchFields.map((field) => {
              const Icon = field.icon;

              return (
                <div
                  key={field.label}
                  className="min-w-0 border border-slate-200/80 bg-white/75 px-3 py-2 shadow-sm shadow-slate-900/[0.03]"
                >
                  <dt className="flex items-center gap-1.5 font-bold uppercase tracking-[0.14em] text-slate-500">
                    <Icon className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" />
                    {field.label}
                  </dt>
                  <dd className="mt-1 truncate text-sm font-semibold text-slate-950">
                    {field.value}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </section>

      <div className="page-shell grid gap-5 pb-6 pt-5 sm:pt-6 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden lg:block lg:self-start lg:sticky lg:top-44 lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto">
          <CarFilters />
        </aside>

        <section className="min-w-0 space-y-4" aria-label="Car results">
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm shadow-slate-900/[0.04] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1
                id="cars-results-heading"
                className="text-lg font-black tracking-[-0.02em] text-slate-950"
              >
                {values.pickupLocation
                  ? `Cars from ${values.pickupLocation}`
                  : "Car rental results"}
              </h1>
              <p className="mt-1 text-sm text-muted">
                Search intent is saved. Live inventory will appear here when the car rental provider connection is available.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="h-10 rounded-md border-slate-300 text-sm font-bold lg:hidden"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal size={17} aria-hidden="true" />
              Filters
            </Button>
          </div>

          <div
            className="rounded-md border border-danger/30 bg-red-50 p-4 text-danger"
            role="status"
          >
            Live car rental search is temporarily unavailable. Please try again shortly.
          </div>
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
        aria-label="Car filters"
      >
        <div className="flex-1 overflow-auto p-5 pb-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Filters</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Available when providers connect
              </p>
            </div>
            <Button
              variant="ghost"
              className="h-10 w-10 px-0"
              aria-label="Close filters"
              onClick={() => setFiltersOpen(false)}
            >
              <X size={20} />
            </Button>
          </div>
          <CarFilters />
        </div>

        <div className="border-t border-slate-200 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <Button
            type="button"
            className="h-12 w-full rounded-xl bg-gradient-to-r from-indigo-700 to-violet-600 text-base font-bold text-white shadow-lg shadow-indigo-700/20"
            onClick={() => setFiltersOpen(false)}
          >
            Done
          </Button>
        </div>
      </aside>
    </main>
  );
}

function SearchInputCell({
  icon: Icon,
  label,
  name,
  placeholder,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  name: keyof Pick<CarsResultsValues, "pickupLocation" | "dropoffLocation">;
  placeholder: string;
  value: string;
}) {
  return (
    <div className="min-w-0 border-slate-200 px-3 py-2 lg:border-r">
      <label
        htmlFor={name}
        className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-500"
      >
        <Icon className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" />
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        defaultValue={value}
        placeholder={placeholder}
        className="mt-1 h-8 w-full border-none bg-transparent p-0 text-[16px] font-semibold text-slate-950 placeholder:text-slate-400 focus:outline-none md:text-sm"
        autoComplete="off"
      />
    </div>
  );
}

function SearchDateCell({
  dropoffDate,
  pickupDate,
}: {
  dropoffDate: string;
  pickupDate: string;
}) {
  return (
    <div className="min-w-0 border-slate-200 px-3 py-2 lg:border-r">
      <div className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-500">
        <CalendarDays className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" />
        Rental dates
      </div>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <label className="sr-only" htmlFor="pickupDate">
          Pickup date
        </label>
        <input
          id="pickupDate"
          name="pickupDate"
          type="date"
          defaultValue={pickupDate}
          className="h-8 min-w-0 border-none bg-transparent p-0 text-[16px] font-semibold text-slate-950 focus:outline-none md:text-sm"
        />
        <label className="sr-only" htmlFor="dropoffDate">
          Return date
        </label>
        <input
          id="dropoffDate"
          name="dropoffDate"
          type="date"
          defaultValue={dropoffDate}
          className="h-8 min-w-0 border-none bg-transparent p-0 text-[16px] font-semibold text-slate-950 focus:outline-none md:text-sm"
        />
      </div>
    </div>
  );
}

function SearchTimeCell({
  dropoffTime,
  pickupTime,
}: {
  dropoffTime: string;
  pickupTime: string;
}) {
  return (
    <div className="min-w-0 border-slate-200 px-3 py-2 lg:border-r">
      <div className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-500">
        <Clock3 className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" />
        Pickup / return time
      </div>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <label className="sr-only" htmlFor="pickupTime">
          Pickup time
        </label>
        <input
          id="pickupTime"
          name="pickupTime"
          type="time"
          defaultValue={pickupTime || "10:00"}
          className="h-8 min-w-0 border-none bg-transparent p-0 text-[16px] font-semibold text-slate-950 focus:outline-none md:text-sm"
        />
        <label className="sr-only" htmlFor="dropoffTime">
          Return time
        </label>
        <input
          id="dropoffTime"
          name="dropoffTime"
          type="time"
          defaultValue={dropoffTime || "10:00"}
          className="h-8 min-w-0 border-none bg-transparent p-0 text-[16px] font-semibold text-slate-950 focus:outline-none md:text-sm"
        />
      </div>
    </div>
  );
}

function CarFilters() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.04]">
      <div className="flex items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-indigo-700 to-violet-600 px-3 py-3">
        <div>
          <h2 className="text-base font-semibold text-white/95">Filter by</h2>
          <p className="mt-0.5 text-xs font-medium text-white/75">
            Reserved for live rental inventory
          </p>
        </div>
        <SlidersHorizontal className="text-white/90" size={18} aria-hidden="true" />
      </div>

      <div className="space-y-4 bg-white px-3 py-3">
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs font-semibold leading-5 text-indigo-900">
          Filter controls are intentionally disabled until provider inventory is connected. No live counts, prices, companies, or availability are shown.
        </div>
        {pendingFilterGroups.map((group) => (
          <PendingFilterSection key={group.title} group={group} />
        ))}
      </div>
    </div>
  );
}

function PendingFilterSection({ group }: { group: PendingFilterGroup }) {
  return (
    <section className="border-t border-slate-200/70 pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold text-slate-900">{group.title}</h3>
      <label className="mt-2 grid cursor-not-allowed grid-cols-[auto_1fr] gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-500">
        <input
          type="checkbox"
          className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300 accent-indigo-600"
          disabled
        />
        <span>
          <span className="block font-semibold text-slate-600">
            Available when providers connect
          </span>
          <span className="mt-0.5 block text-xs leading-5 text-slate-500">
            {group.description}
          </span>
        </span>
      </label>
    </section>
  );
}
