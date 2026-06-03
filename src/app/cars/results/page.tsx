import Link from "next/link";
import {
  CalendarDays,
  Clock3,
  MapPin,
  Search,
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

const filterGroups: FilterGroup[] = [
  {
    title: "Vehicle type",
    options: ["Small cars", "Medium cars", "SUVs", "Vans"],
  },
  {
    title: "Rental company",
    options: ["Supplier selection"],
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
    options: ["1+ bags", "2+ bags", "3+ bags"],
  },
  {
    title: "Mileage policy",
    options: ["Unlimited mileage", "Limited mileage"],
  },
  {
    title: "Cancellation",
    options: ["Free cancellation", "Pay later", "Policy available"],
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

const defaultDriverAge = "18-70";
const driverAgeRangeLabel = "Any driver age 18–70";

const displayValue = (value: string) => value || "Not selected";

const formatDriverAge = (driverAge: string) => {
  if (!driverAge) {
    return "Not selected";
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

  const searchSummary: SummaryItem[] = [
    {
      label: "Pickup location",
      value: displayValue(pickupLocation),
      icon: MapPin,
    },
    {
      label: "Pickup date",
      value: formatDate(pickupDate),
      icon: CalendarDays,
    },
    {
      label: "Pickup time",
      value: displayValue(pickupTime),
      icon: Clock3,
    },
    {
      label: "Return location",
      value: displayValue(resolvedDropoffLocation),
      icon: MapPin,
    },
    {
      label: "Return date",
      value: formatDate(dropoffDate),
      icon: CalendarDays,
    },
    {
      label: "Return time",
      value: displayValue(dropoffTime),
      icon: Clock3,
    },
    {
      label: "Driver age",
      value: formatDriverAge(driverAge),
      icon: Users,
    },
  ];

  return (
    <>
      <AppHeader />
      <main className="flex-1 bg-slate-50 pb-8 pt-6 sm:pt-8 lg:pt-8">
        <div className="sticky top-16 z-30 border-b border-border bg-white/95 backdrop-blur">
          <section
            className="page-shell py-3"
            aria-labelledby="cars-results-heading"
          >
            <div className="rounded-2xl border border-indigo-100 bg-white p-3 shadow-[0_16px_40px_-30px_rgba(30,27,75,0.42)]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">
                    Car rental results
                  </p>
                  <h1
                    id="cars-results-heading"
                    className="mt-1 truncate text-xl font-black tracking-[-0.03em] text-indigo-950 sm:text-2xl"
                  >
                    {pickupLocation
                      ? `Cars from ${pickupLocation}`
                      : "Car rental results"}
                  </h1>
                </div>

                <Link
                  href={editHref}
                  className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 active:bg-indigo-700"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Edit search
                </Link>
              </div>

              <dl className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                {searchSummary.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.label}
                      className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                    >
                      <dt className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-500">
                        <Icon
                          className="h-3.5 w-3.5 text-violet-600"
                          aria-hidden="true"
                        />
                        {item.label}
                      </dt>
                      <dd className="mt-1 truncate text-sm font-semibold text-indigo-950">
                        {item.value}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          </section>
        </div>

        <div className="page-shell grid gap-6 py-6 lg:grid-cols-[290px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <CarFilters />
          </aside>

          <section className="min-w-0 space-y-4" aria-label="Car results">
            <div className="rounded-md border border-danger/30 bg-red-50 p-4 text-danger">
              Live car rental search is temporarily unavailable. Please try
              again shortly.
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

function CarFilters() {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-[0_16px_40px_-24px_rgba(30,27,75,0.45)] lg:sticky lg:top-44 lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-violet-700" aria-hidden="true" />
        <h2 className="text-base font-bold text-indigo-950">Filters</h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted">
        Filters become available when live car rental inventory is connected.
      </p>

      <div className="mt-5 divide-y divide-indigo-100">
        {filterGroups.map((group) => (
          <FilterSection key={group.title} title={group.title}>
            <div className="grid gap-2">
              {group.options.map((option) => (
                <label
                  key={option}
                  className="grid cursor-not-allowed grid-cols-[auto_1fr] items-center gap-2 text-sm text-muted"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-indigo-200 accent-violet-600"
                    disabled
                  />
                  <span className="min-w-0 truncate">{option}</span>
                </label>
              ))}
            </div>
          </FilterSection>
        ))}
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
