"use client";

import { useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
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

type CarFilterGroup = {
  title: string;
  options: string[];
};

const defaultDriverAge = "18-70";
const driverAgeRangeLabel = "Any driver age 18–70";

const driverAgeOptions = [
  defaultDriverAge,
  ...Array.from({ length: 58 }, (_, index) => String(index + 18)),
];

const carFilterGroups: CarFilterGroup[] = [
  {
    title: "Vehicle type",
    options: ["Small cars", "Medium cars", "SUVs"],
  },
  {
    title: "Transmission",
    options: ["Automatic", "Manual"],
  },
  {
    title: "Seats",
    options: ["4+ seats", "5+ seats", "7+ seats"],
  },
  {
    title: "Bags",
    options: ["2+ bags", "3+ bags", "4+ bags"],
  },
  {
    title: "Fuel policy",
    options: ["Full-to-full", "Same-to-same"],
  },
  {
    title: "Mileage policy",
    options: ["Unlimited mileage", "Limited mileage"],
  },
  {
    title: "Cancellation",
    options: ["Free cancellation", "Pay at pickup"],
  },
  {
    title: "Pickup location type",
    options: ["Airport counter", "Shuttle pickup", "City location"],
  },
];

const formatDate = (date: string) => {
  if (!date) {
    return "Select date";
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

const getDriverAgeOptionLabel = (age: string) =>
  age === defaultDriverAge ? driverAgeRangeLabel : `${age} years old`;

const fieldShellClass =
  "relative min-h-[54px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 transition-colors hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/40 lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0";

const fieldLabelClass =
  "mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase leading-4 tracking-wide text-slate-600";

const fieldInputClass =
  "focus-ring h-8 w-full border-0 bg-transparent p-0 text-[16px] font-medium text-slate-900 outline-none placeholder:text-slate-400 md:text-sm";

export function CarsResultsClient({ values }: { values: CarsResultsValues }) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const resolvedDropoffLocation = values.dropoffLocation || values.pickupLocation;
  const driverAge = values.driverAge || defaultDriverAge;
  const hasSearchContext = Boolean(
    values.pickupLocation || values.pickupDate || values.dropoffDate,
  );

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
            <div className="overflow-visible rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_10px_28px_rgba(15,23,42,0.10)]">
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1.35fr)_minmax(0,1.55fr)_minmax(0,1.35fr)_minmax(8rem,0.8fr)_112px] lg:gap-0">
                <SearchInputCell
                  icon={MapPin}
                  label="Pickup location"
                  name="pickupLocation"
                  placeholder="Airport, city, or address"
                  value={values.pickupLocation}
                  className="lg:rounded-l-xl"
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
                <DriverAgeCell driverAge={driverAge} />
                <Button
                  type="submit"
                  className="mt-2 h-12 w-full rounded-xl bg-gradient-to-r from-indigo-700 to-violet-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-700/20 sm:mt-3 lg:mt-0 lg:h-auto lg:min-h-[54px] lg:self-stretch lg:rounded-none lg:rounded-r-xl lg:border lg:border-l-0 lg:border-indigo-600/20"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Search
                </Button>
              </div>
            </div>
          </form>
        </div>
      </section>

      <div className="page-shell grid gap-5 pb-6 pt-5 sm:pt-6 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden lg:block lg:self-start lg:sticky lg:top-36 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto">
          <CarFilters />
        </aside>

        <section className="min-w-0 space-y-4" aria-label="Car results">
          <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm shadow-slate-900/[0.04] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">
                Car rentals
              </p>
              <h1
                id="cars-results-heading"
                className="mt-1 text-lg font-black tracking-[-0.02em] text-slate-950 sm:text-xl"
              >
                {values.pickupLocation
                  ? `Cars from ${values.pickupLocation}`
                  : "Search car rentals"}
              </h1>
              <p className="mt-1 text-sm text-muted">
                {hasSearchContext
                  ? "We could not find cars for these details right now. Adjust your dates or location and search again."
                  : "Enter your pickup details to start a car rental search."}
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

          <EmptyCarsState hasSearchContext={hasSearchContext} />
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
                Available with matching results
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
  className,
}: {
  icon: typeof MapPin;
  label: string;
  name: keyof Pick<CarsResultsValues, "pickupLocation" | "dropoffLocation">;
  placeholder: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn(fieldShellClass, className)}>
      <label htmlFor={name} className={fieldLabelClass}>
        <Icon className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" />
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        defaultValue={value}
        placeholder={placeholder}
        className={fieldInputClass}
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
    <div className={fieldShellClass}>
      <div className={fieldLabelClass}>
        <CalendarDays className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" />
        Rental dates
      </div>
      <div className="grid h-8 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <label className="sr-only" htmlFor="pickupDate">
          Pickup date
        </label>
        <input
          id="pickupDate"
          name="pickupDate"
          type="date"
          defaultValue={pickupDate}
          aria-label={`Pickup date, ${formatDate(pickupDate)}`}
          className={cn(fieldInputClass, "min-w-0")}
        />
        <span className="text-slate-300" aria-hidden="true">
          —
        </span>
        <label className="sr-only" htmlFor="dropoffDate">
          Return date
        </label>
        <input
          id="dropoffDate"
          name="dropoffDate"
          type="date"
          defaultValue={dropoffDate}
          aria-label={`Return date, ${formatDate(dropoffDate)}`}
          className={cn(fieldInputClass, "min-w-0")}
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
    <div className={fieldShellClass}>
      <div className={fieldLabelClass}>
        <Clock3 className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" />
        Pickup / return time
      </div>
      <div className="grid h-8 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <label className="sr-only" htmlFor="pickupTime">
          Pickup time
        </label>
        <input
          id="pickupTime"
          name="pickupTime"
          type="time"
          defaultValue={pickupTime || "10:00"}
          className={cn(fieldInputClass, "min-w-0")}
        />
        <span className="text-slate-300" aria-hidden="true">
          —
        </span>
        <label className="sr-only" htmlFor="dropoffTime">
          Return time
        </label>
        <input
          id="dropoffTime"
          name="dropoffTime"
          type="time"
          defaultValue={dropoffTime || "10:00"}
          className={cn(fieldInputClass, "min-w-0")}
        />
      </div>
    </div>
  );
}

function DriverAgeCell({ driverAge }: { driverAge: string }) {
  return (
    <div className={fieldShellClass}>
      <label htmlFor="driverAge" className={fieldLabelClass}>
        <Users className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" />
        Driver age
      </label>
      <select
        id="driverAge"
        name="driverAge"
        defaultValue={driverAge}
        className={cn(fieldInputClass, "appearance-none pr-4")}
      >
        {driverAgeOptions.map((age) => (
          <option key={age} value={age}>
            {getDriverAgeOptionLabel(age)}
          </option>
        ))}
      </select>
    </div>
  );
}

function EmptyCarsState({ hasSearchContext }: { hasSearchContext: boolean }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.04]"
      role="status"
    >
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/70 px-5 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">
              No cars found
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950">
              Try adjusting your search details
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {hasSearchContext
                ? "We saved this search, but there are no car rental options to show for these details right now. Try different dates, times, or a nearby pickup location."
                : "Add a pickup location and rental dates above to look for car rental options that fit your trip."}
            </p>
          </div>
          <div className="rounded-2xl border border-indigo-100 bg-white p-3 text-indigo-700 shadow-sm shadow-indigo-900/[0.04]">
            <Search className="h-6 w-6" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="grid gap-3 px-5 py-5 sm:grid-cols-3">
        {[
          "Check nearby pickup locations",
          "Try different rental dates",
          "Adjust pickup or return times",
        ].map((tip) => (
          <div
            key={tip}
            className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm font-semibold text-slate-700"
          >
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0 text-violet-600"
              aria-hidden="true"
            />
            <span>{tip}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CarFilters() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.04]">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-white px-4 py-4">
        <div>
          <h2 className="text-base font-bold text-slate-950">Filters</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Available with matching results
          </p>
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-700">
          <SlidersHorizontal size={18} aria-hidden="true" />
        </span>
      </div>

      <div className="space-y-4 bg-white px-4 py-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm font-medium leading-6 text-slate-600">
          Filters will become available when results are available.
        </div>
        {carFilterGroups.map((group) => (
          <FilterSection key={group.title} group={group} />
        ))}
      </div>
    </div>
  );
}

function FilterSection({ group }: { group: CarFilterGroup }) {
  return (
    <section className="border-t border-slate-200/70 pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-bold text-slate-950">{group.title}</h3>
      <div className="mt-2 space-y-2" aria-disabled="true">
        {group.options.map((option) => (
          <label
            key={option}
            className="grid cursor-not-allowed grid-cols-[auto_1fr] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm font-semibold text-slate-500 opacity-75"
          >
            <input
              type="checkbox"
              className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 accent-indigo-600"
              disabled
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
