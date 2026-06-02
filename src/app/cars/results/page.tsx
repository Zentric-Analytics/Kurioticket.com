import Link from "next/link";
import {
  ArrowLeft,
  Bed,
  CalendarClock,
  Car,
  CheckCircle2,
  MapPin,
  Plane,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";

type CarsResultsSearchParams = Promise<{
  pickupLocation?: string | string[];
  pickupDate?: string | string[];
  pickupTime?: string | string[];
  dropoffLocation?: string | string[];
  dropoffDate?: string | string[];
  dropoffTime?: string | string[];
  driverAge?: string | string[];
}>;

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
  const editParams = new URLSearchParams();

  [
    ["pickupLocation", pickupLocation],
    ["pickupDate", pickupDate],
    ["pickupTime", pickupTime],
    ["dropoffDate", dropoffDate],
    ["dropoffTime", dropoffTime],
    ["driverAge", driverAge],
    ["dropoffLocation", dropoffLocation],
  ].forEach(([key, value]) => {
    if (value) {
      editParams.set(key, value);
    }
  });

  const editHref = editParams.toString() ? `/cars?${editParams.toString()}` : "/cars";
  const sameDropoff = Boolean(
    pickupLocation && (!dropoffLocation || dropoffLocation === pickupLocation),
  );

  const searchSummary = [
    {
      label: "Pickup",
      value: displayValue(pickupLocation),
    },
    {
      label: "Return",
      value: sameDropoff ? "Same as pickup" : displayValue(dropoffLocation),
    },
    {
      label: "Pickup date",
      value: pickupDate ? `${formatDate(pickupDate)}${pickupTime ? `, ${pickupTime}` : ""}` : "Not selected",
    },
    {
      label: "Return date",
      value: dropoffDate ? `${formatDate(dropoffDate)}${dropoffTime ? `, ${dropoffTime}` : ""}` : "Not selected",
    },
    {
      label: "Driver age",
      value: driverAge || "Not selected",
    },
  ];

  return (
    <>
      <AppHeader />
      <main className="page-shell relative isolate flex-1 overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#f6f7fb_48%,#f8fafc_100%)] pb-16 pt-6 sm:pt-8 lg:pt-10">
        <div className="pointer-events-none absolute left-1/2 top-10 -z-10 h-64 w-[min(50rem,88vw)] -translate-x-1/2 rounded-full bg-white/55 blur-3xl" />
        <div className="pointer-events-none absolute -right-28 bottom-28 -z-10 h-80 w-80 rounded-full bg-slate-200/14 blur-3xl" />

        <section className="mx-auto max-w-6xl space-y-6 md:space-y-8">
          <div className="border border-slate-200/80 bg-white/90 p-3 shadow-[0_16px_44px_-40px_rgba(15,23,42,0.28)] ring-1 ring-white/80 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700">
                  <Car className="h-4 w-4" aria-hidden="true" />
                  Cars results
                </p>
                <h1 className="mt-1 truncate text-2xl font-black tracking-[-0.03em] text-slate-950 md:text-3xl">
                  {pickupLocation ? `Cars from ${pickupLocation}` : "Car rental results"}
                </h1>
              </div>

              <Link
                href={editHref}
                className="focus-ring inline-flex items-center justify-center gap-2 border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Edit search
              </Link>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {searchSummary.map((item) => (
                <div key={item.label} className="border border-slate-200 bg-slate-50/80 px-3 py-2">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
            <aside className="border border-slate-200/80 bg-white/88 p-4 shadow-[0_16px_44px_-42px_rgba(15,23,42,0.32)] ring-1 ring-white/80">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center border border-indigo-100 bg-indigo-50 text-indigo-700">
                  <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-950">Filter cars</p>
                  <p className="text-xs text-slate-500">Ready for provider data</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 text-sm">
                {[
                  "Vehicle type",
                  "Pickup provider",
                  "Mileage policy",
                  "Cancellation rules",
                  "Baggage space",
                ].map((label) => (
                  <div key={label} className="border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-slate-500">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-700">{label}</span>
                      <span className="text-xs font-semibold text-slate-400">Soon</span>
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            <section className="space-y-4">
              <div className="border border-slate-200/80 bg-white/90 p-4 shadow-[0_16px_44px_-42px_rgba(15,23,42,0.32)] ring-1 ring-white/80 md:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">0 live cars found</p>
                    <h2 className="mt-1 text-xl font-black tracking-[-0.02em] text-slate-950 md:text-2xl">
                      Live car rental search is not connected yet
                    </h2>
                  </div>
                  <span className="inline-flex items-center gap-2 border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    Provider pending
                  </span>
                </div>

                <div className="mt-5 border border-dashed border-slate-300 bg-slate-50/80 p-5 md:p-7">
                  <div className="mx-auto max-w-2xl text-center">
                    <span className="mx-auto inline-flex h-12 w-12 items-center justify-center border border-indigo-100 bg-indigo-50 text-indigo-700">
                      <Search className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 text-lg font-black tracking-[-0.02em] text-slate-950 md:text-xl">
                      Your search details are ready
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600 md:text-base md:leading-7">
                      Kurioticket is not connected to an approved live car rental provider yet, so this results page keeps the flight/hotel-style layout without showing fake cars, fake prices, sandbox inventory, or unverified booking actions.
                    </p>

                    <div className="mt-5 grid gap-2 sm:grid-cols-3">
                      <Link
                        href={editHref}
                        className="focus-ring inline-flex items-center justify-center gap-2 bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500"
                      >
                        Edit car search
                      </Link>
                      <Link
                        href="/flights/results"
                        className="focus-ring inline-flex items-center justify-center gap-2 border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition hover:border-indigo-200 hover:bg-indigo-50"
                      >
                        <Plane className="h-4 w-4" aria-hidden="true" />
                        Flights
                      </Link>
                      <Link
                        href="/hotels"
                        className="focus-ring inline-flex items-center justify-center gap-2 border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition hover:border-indigo-200 hover:bg-indigo-50"
                      >
                        <Bed className="h-4 w-4" aria-hidden="true" />
                        Hotels
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {[
                  {
                    title: "Search preserved",
                    body: "Pickup, return, dates, times, and driver age stay attached to the results URL.",
                    icon: MapPin,
                  },
                  {
                    title: "Provider-ready layout",
                    body: "The page is structured for future vehicle cards, filters, and partner redirects.",
                    icon: CalendarClock,
                  },
                  {
                    title: "No fake inventory",
                    body: "Car listings will only appear after an approved live rental provider is connected.",
                    icon: CheckCircle2,
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <article key={item.title} className="border border-slate-200/80 bg-white/82 p-4 shadow-[0_16px_38px_-42px_rgba(15,23,42,0.35)] ring-1 ring-white/80">
                      <Icon className="h-5 w-5 text-indigo-600" aria-hidden="true" />
                      <h3 className="mt-3 text-sm font-bold text-slate-950">{item.title}</h3>
                      <p className="mt-1.5 text-sm leading-6 text-slate-600">{item.body}</p>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
