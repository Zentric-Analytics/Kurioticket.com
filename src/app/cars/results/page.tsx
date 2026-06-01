import Link from "next/link";
import {
  ArrowLeft,
  Bed,
  Car,
  CheckCircle2,
  MapPin,
  Plane,
  ShieldCheck,
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

const formatDateTime = (date: string, time: string) => {
  if (!date && !time) {
    return "Not selected";
  }

  if (!date) {
    return time || "Not selected";
  }

  const [year, month, day] = date.split("-").map(Number);
  const formattedDate =
    year && month && day
      ? new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(new Date(year, month - 1, day))
      : date;

  return time ? `${formattedDate} at ${time}` : formattedDate;
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

  const summaryItems = [
    {
      label: "Pickup location",
      value: displayValue(pickupLocation),
    },
    {
      label: "Drop-off location",
      value: sameDropoff ? "Same as pickup" : displayValue(dropoffLocation),
    },
    {
      label: "Pickup date and time",
      value: formatDateTime(pickupDate, pickupTime),
    },
    {
      label: "Drop-off date and time",
      value: formatDateTime(dropoffDate, dropoffTime),
    },
    {
      label: "Driver age",
      value: driverAge ? `${driverAge}` : "Not selected",
    },
  ];

  return (
    <>
      <AppHeader />
      <main className="bg-gradient-to-b from-indigo-50 via-white to-slate-50">
        <section className="page-shell py-8 md:py-12 lg:py-16">
          <div className="mb-8 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm">
              <Car className="h-4 w-4" aria-hidden="true" />
              Cars search details
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              Your car search is ready for live provider results
            </h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              The submitted details are preserved without showing unverified vehicle listings.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl bg-indigo-50 p-3 text-indigo-700">
                  <MapPin className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-700">
                    Search summary
                  </p>
                  <h2 className="text-xl font-bold text-slate-950">Trip details</h2>
                </div>
              </div>

              <dl className="mt-6 grid gap-4">
                {summaryItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <dt className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                      {item.label}
                    </dt>
                    <dd className="mt-1 text-base font-semibold text-slate-950">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </aside>

            <section className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-xl shadow-indigo-950/10 md:p-8">
              <span className="inline-flex rounded-2xl bg-violet-50 p-3 text-violet-700">
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950">
                Live car rental search is not available yet
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-700">
                Kurioticket is not connected to an approved live car rental provider for this search yet, so we won’t show placeholder cars, fake prices, or sandbox inventory in production.
              </p>
              <p className="mt-4 leading-7 text-slate-600">
                Your search details are preserved in the URL so this page is ready for a future live provider integration.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <Link
                  href={editHref}
                  className="focus-ring inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Edit car search
                </Link>
                <Link
                  href="/flights/results"
                  className="focus-ring inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:border-indigo-200 hover:bg-indigo-50"
                >
                  <Plane className="h-4 w-4" aria-hidden="true" />
                  Search flights
                </Link>
                <Link
                  href="/hotels"
                  className="focus-ring inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:border-indigo-200 hover:bg-indigo-50"
                >
                  <Bed className="h-4 w-4" aria-hidden="true" />
                  Search hotels
                </Link>
              </div>

              <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex gap-3">
                  <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-indigo-600" aria-hidden="true" />
                  <p className="leading-7 text-slate-700">
                    This production shell intentionally avoids provider names, vehicle cards, booking actions, and unverified rental details until a live integration is approved.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
