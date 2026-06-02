import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  CalendarClock,
  Car,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Fuel,
  Gauge,
  MapPin,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";

type CarsResultsSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

type SummaryItem = {
  label: string;
  value: string;
  icon: typeof MapPin;
};

type FilterGroup = {
  title: string;
  options: string[];
};

type PlaceholderCard = {
  eyebrow: string;
  title: string;
  details: string[];
  highlights: string[];
  footer: string;
};

const filterGroups: FilterGroup[] = [
  {
    title: "Vehicle type",
    options: [
      "Vehicle classes pending",
      "Compact through SUV",
      "Specialty categories",
    ],
  },
  {
    title: "Rental company",
    options: ["Rental company pending", "Approved provider required"],
  },
  {
    title: "Transmission",
    options: ["Automatic", "Manual"],
  },
  {
    title: "Seats",
    options: ["2+ seats", "4+ seats", "5+ seats", "7+ seats"],
  },
  {
    title: "Bags",
    options: ["Small bag capacity", "Large bag capacity"],
  },
  {
    title: "Mileage policy",
    options: ["Mileage policy pending", "Unlimited mileage when provided"],
  },
  {
    title: "Fuel policy",
    options: ["Fuel policy pending", "Full-to-full when provided"],
  },
  {
    title: "Cancellation",
    options: ["Cancellation terms pending", "Flexible terms when provided"],
  },
  {
    title: "Pickup location type",
    options: [
      "Airport counter",
      "City location",
      "Station location",
      "Hotel-area location",
    ],
  },
];

const placeholderCards: PlaceholderCard[] = [
  {
    eyebrow: "Vehicle result slot",
    title: "Vehicle details will appear here",
    details: [
      "Rental company pending",
      "Pickup instructions pending",
      "Live provider required",
    ],
    highlights: ["Seats and bags", "Transmission", "Mileage policy"],
    footer: "Booking unavailable until provider connection",
  },
  {
    eyebrow: "Price comparison slot",
    title: "Pricing unavailable",
    details: [
      "Live rates required",
      "Taxes and fees pending",
      "Rental terms pending",
    ],
    highlights: ["Fuel policy", "Cancellation", "Deposit terms"],
    footer: "Provider connection required",
  },
  {
    eyebrow: "Pickup details slot",
    title: "Pickup location details pending",
    details: [
      "Counter type pending",
      "Shuttle details pending",
      "Opening hours pending",
    ],
    highlights: ["Location type", "Pickup steps", "Return guidance"],
    footer: "Live provider required",
  },
  {
    eyebrow: "Policy details slot",
    title: "Rental policies will appear here",
    details: [
      "Cancellation policy pending",
      "Mileage rules pending",
      "Fuel terms pending",
    ],
    highlights: ["Policy summary", "Driver rules", "Included coverage"],
    footer: "Booking unavailable until provider connection",
  },
];

const getParamValue = (
  params: Awaited<CarsResultsSearchParams>,
  key: keyof Awaited<CarsResultsSearchParams>,
) => {
  const value = params[key];

  if (Array.isArray(value)) {
    return value[0]?.trim() || "";
  }

  return value?.trim() || "";
};

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

const displayValue = (value: string) => value || "Not selected";

const buildEditHref = (params: Awaited<CarsResultsSearchParams>) => {
  const editParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item?.trim()) {
          editParams.append(key, item.trim());
        }
      });
      return;
    }

    if (value?.trim()) {
      editParams.set(key, value.trim());
    }
  });

  return editParams.toString() ? `/cars?${editParams.toString()}` : "/cars";
};

const formatDateTime = (date: string, time: string) => {
  if (!date) {
    return "Not selected";
  }

  return `${formatDate(date)}${time ? `, ${time}` : ""}`;
};

export default async function CarsResultsPage({
  searchParams,
}: {
  searchParams: CarsResultsSearchParams;
}) {
  const params = await searchParams;
  const pickupLocation = getParamValue(params, "pickupLocation");
  const dropoffLocation = getParamValue(params, "dropoffLocation");
  const pickupDate = getParamValue(params, "pickupDate");
  const pickupTime = getParamValue(params, "pickupTime");
  const dropoffDate = getParamValue(params, "dropoffDate");
  const dropoffTime = getParamValue(params, "dropoffTime");
  const driverAge = getParamValue(params, "driverAge");
  const editHref = buildEditHref(params);
  const resolvedDropoffLocation = dropoffLocation || pickupLocation;
  const sameDropoff = Boolean(
    pickupLocation && (!dropoffLocation || dropoffLocation === pickupLocation),
  );

  const searchSummary: SummaryItem[] = [
    {
      label: "Pickup location",
      value: displayValue(pickupLocation),
      icon: MapPin,
    },
    {
      label: "Return location",
      value: sameDropoff
        ? displayValue(resolvedDropoffLocation)
        : displayValue(dropoffLocation),
      icon: MapPin,
    },
    {
      label: "Pickup date & time",
      value: formatDateTime(pickupDate, pickupTime),
      icon: CalendarClock,
    },
    {
      label: "Return date & time",
      value: formatDateTime(dropoffDate, dropoffTime),
      icon: Clock3,
    },
    {
      label: "Driver age",
      value: driverAge ? `${driverAge} years old` : "Not selected",
      icon: Users,
    },
  ];

  return (
    <>
      <AppHeader />
      <main className="page-shell relative isolate flex-1 overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#f6f7fb_48%,#f8fafc_100%)] pb-14 pt-5 sm:pt-7 lg:pt-9">
        <div className="pointer-events-none absolute left-1/2 top-6 -z-10 h-64 w-[min(52rem,90vw)] -translate-x-1/2 rounded-full bg-white/70 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-32 -z-10 h-80 w-80 rounded-full bg-indigo-100/24 blur-3xl" />

        <section
          className="mx-auto max-w-7xl space-y-5 md:space-y-6"
          aria-labelledby="cars-results-heading"
        >
          <div className="overflow-hidden rounded-[1.25rem] border border-slate-200/80 bg-white/94 shadow-[0_18px_54px_-46px_rgba(15,23,42,0.42)] ring-1 ring-white/80">
            <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 text-sm font-bold text-indigo-700">
                  <Car className="h-4 w-4" aria-hidden="true" />
                  Car rental results
                </p>
                <h1
                  id="cars-results-heading"
                  className="mt-1 truncate text-2xl font-black tracking-[-0.035em] text-slate-950 md:text-3xl"
                >
                  {pickupLocation
                    ? `Cars from ${pickupLocation}`
                    : "Car rental results"}
                </h1>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Compare-ready results layout with live inventory pending
                  provider connection.
                </p>
              </div>

              <Link
                href={editHref}
                className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Edit search
              </Link>
            </div>

            <div className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-5">
              {searchSummary.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3"
                  >
                    <div className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                      <Icon
                        className="h-3.5 w-3.5 text-indigo-500"
                        aria-hidden="true"
                      />
                      {item.label}
                    </div>
                    <p className="mt-1.5 truncate text-sm font-semibold text-slate-950">
                      {item.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start">
            <aside className="rounded-[1.25rem] border border-slate-200/80 bg-white/94 p-4 shadow-[0_18px_50px_-46px_rgba(15,23,42,0.38)] ring-1 ring-white/80 lg:sticky lg:top-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-700">
                    <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-sm font-black text-slate-950">
                      Filters
                    </h2>
                    <p className="text-xs font-medium text-slate-500">
                      Provider-backed controls reserved
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Pending
                </span>
              </div>

              <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                Filters are visible in their production positions and activate
                when live rental inventory is connected.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {filterGroups.map((group) => (
                  <fieldset
                    key={group.title}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-3 disabled:opacity-100"
                    disabled
                  >
                    <legend className="px-1 text-sm font-bold text-slate-900">
                      {group.title}
                    </legend>
                    <div className="mt-2 space-y-2">
                      {group.options.map((option) => (
                        <label
                          key={option}
                          className="flex cursor-not-allowed items-center gap-2 text-sm font-medium text-slate-500"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                            disabled
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
            </aside>

            <section
              className="min-w-0 space-y-4"
              aria-label="Car results list"
            >
              <div className="rounded-[1.25rem] border border-slate-200/80 bg-white/94 p-4 shadow-[0_18px_50px_-46px_rgba(15,23,42,0.38)] ring-1 ring-white/80">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-950">
                      0 live vehicle results loaded
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Car results layout is ready. Live vehicle inventory will
                      appear here once an approved rental provider is connected.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <label className="relative min-w-48">
                      <span className="sr-only">Sort car results</span>
                      <select
                        disabled
                        className="min-h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 pr-9 text-sm font-bold text-slate-600 opacity-100"
                        defaultValue="recommended"
                      >
                        <option value="recommended">Sort: Recommended</option>
                        <option value="price">Price: provider pending</option>
                        <option value="vehicle-type">
                          Vehicle type: provider pending
                        </option>
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                        aria-hidden="true"
                      />
                    </label>
                    <span className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700">
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      Provider pending
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {placeholderCards.map((card, index) => (
                  <article
                    key={card.eyebrow}
                    className="overflow-hidden rounded-[1.25rem] border border-slate-200/80 bg-white/94 shadow-[0_18px_50px_-46px_rgba(15,23,42,0.42)] ring-1 ring-white/80"
                  >
                    <div className="grid gap-0 md:grid-cols-[13rem_minmax(0,1fr)_15rem]">
                      <div className="flex min-h-36 items-center justify-center bg-[linear-gradient(135deg,#f8fafc,#eef2ff)] p-5 md:min-h-full">
                        <div className="w-full max-w-40 rounded-2xl border border-white/80 bg-white/80 p-4 text-center shadow-sm">
                          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                            <Car className="h-7 w-7" aria-hidden="true" />
                          </div>
                          <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                            Result slot {index + 1}
                          </p>
                        </div>
                      </div>

                      <div className="min-w-0 border-y border-slate-100 p-4 md:border-y-0 md:border-r md:p-5">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
                          {card.eyebrow}
                        </p>
                        <h3 className="mt-2 text-xl font-black tracking-[-0.025em] text-slate-950">
                          {card.title}
                        </h3>

                        <div className="mt-4 grid gap-2 sm:grid-cols-3">
                          {card.details.map((detail) => (
                            <div
                              key={detail}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                            >
                              <p className="text-sm font-semibold text-slate-700">
                                {detail}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {card.highlights.map((highlight) => (
                            <span
                              key={highlight}
                              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600"
                            >
                              <CheckCircle2
                                className="h-3.5 w-3.5 text-slate-400"
                                aria-hidden="true"
                              />
                              {highlight}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col justify-between gap-4 p-4 md:p-5">
                        <div className="space-y-3">
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                              Price
                            </p>
                            <p className="mt-1 text-lg font-black text-slate-950">
                              Pricing unavailable
                            </p>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-slate-500">
                            <span
                              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2"
                              title="Seats pending"
                            >
                              <Users className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span
                              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2"
                              title="Bags pending"
                            >
                              <Briefcase
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            </span>
                            <span
                              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2"
                              title="Mileage pending"
                            >
                              <Gauge className="h-4 w-4" aria-hidden="true" />
                            </span>
                          </div>
                          <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
                            <Fuel className="h-4 w-4" aria-hidden="true" />
                            Fuel policy pending
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled
                          className="min-h-11 cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-500 opacity-100"
                        >
                          {card.footer}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
