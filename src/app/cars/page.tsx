"use client";

import { FormEvent, ReactNode, Suspense, useMemo, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  Car,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
} from "lucide-react";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";

type CarsFormValues = {
  pickupLocation: string;
  pickupDate: string;
  pickupTime: string;
  dropoffDate: string;
  dropoffTime: string;
  driverAge: string;
  returnToDifferentLocation: boolean;
  dropoffLocation: string;
};

type CarsFormErrors = Partial<Record<keyof CarsFormValues | "dateRange", string>>;

const driverAgeOptions = [
  "18",
  "19",
  "20",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
  "29",
  "30",
  "31",
  "32",
  "33",
  "34",
  "35",
  "36",
  "37",
  "38",
  "39",
  "40",
  "45",
  "50",
  "55",
  "60",
  "65",
  "70",
  "75",
];

const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? "00" : "30";

  return `${String(hour).padStart(2, "0")}:${minute}`;
});

const trustCards = [
  {
    title: "Built for complete trips",
    description: "Keep flights, stays, and ground plans in one travel flow.",
    icon: CheckCircle2,
  },
  {
    title: "Pickup details first",
    description:
      "Start with dates, times, driver age, and location so provider results can be matched later.",
    icon: CalendarClock,
  },
  {
    title: "No placeholder pricing",
    description:
      "Kurioticket only shows rental prices after a live provider is connected.",
    icon: ShieldCheck,
  },
];

const getSearchParam = (params: URLSearchParams | null, key: string) =>
  params?.get(key)?.trim() ?? "";

const getInitialValues = (params: URLSearchParams | null): CarsFormValues => {
  const pickupLocation = getSearchParam(params, "pickupLocation");
  const dropoffLocation = getSearchParam(params, "dropoffLocation");
  const differentDropoff = Boolean(
    dropoffLocation && pickupLocation && dropoffLocation !== pickupLocation,
  );

  return {
    pickupLocation,
    pickupDate: getSearchParam(params, "pickupDate"),
    pickupTime: getSearchParam(params, "pickupTime") || "10:00",
    dropoffDate: getSearchParam(params, "dropoffDate"),
    dropoffTime: getSearchParam(params, "dropoffTime") || "10:00",
    driverAge: getSearchParam(params, "driverAge") || "30",
    returnToDifferentLocation: differentDropoff,
    dropoffLocation: differentDropoff ? dropoffLocation : "",
  };
};

const validateCarsForm = (values: CarsFormValues): CarsFormErrors => {
  const errors: CarsFormErrors = {};
  const pickupLocation = values.pickupLocation.trim();
  const dropoffLocation = values.dropoffLocation.trim();
  const driverAge = Number.parseInt(values.driverAge, 10);

  if (!pickupLocation) {
    errors.pickupLocation = "Enter a pickup location.";
  }

  if (!values.pickupDate) {
    errors.pickupDate = "Select a pickup date.";
  }

  if (!values.pickupTime) {
    errors.pickupTime = "Select a pickup time.";
  }

  if (!values.dropoffDate) {
    errors.dropoffDate = "Select a drop-off date.";
  }

  if (!values.dropoffTime) {
    errors.dropoffTime = "Select a drop-off time.";
  }

  if (!values.driverAge || Number.isNaN(driverAge) || driverAge < 18 || driverAge > 99) {
    errors.driverAge = "Select a driver age between 18 and 99.";
  }

  if (values.returnToDifferentLocation && !dropoffLocation) {
    errors.dropoffLocation = "Enter a drop-off location.";
  }

  if (values.pickupDate && values.dropoffDate) {
    if (values.dropoffDate < values.pickupDate) {
      errors.dateRange = "Drop-off date cannot be before pickup date.";
    } else if (
      values.dropoffDate === values.pickupDate &&
      values.pickupTime &&
      values.dropoffTime &&
      values.dropoffTime <= values.pickupTime
    ) {
      errors.dateRange = "For same-day returns, drop-off time must be after pickup time.";
    }
  }

  return errors;
};

export default function CarsPage() {
  return (
    <Suspense fallback={<CarsPageShell />}>
      <CarsSearchPage />
    </Suspense>
  );
}

function CarsSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialValues = useMemo(() => getInitialValues(searchParams), [searchParams]);
  const [values, setValues] = useState<CarsFormValues>(initialValues);
  const [errors, setErrors] = useState<CarsFormErrors>({});

  const updateValue = <Key extends keyof CarsFormValues>(
    key: Key,
    value: CarsFormValues[Key],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined, dateRange: undefined }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateCarsForm(values);
    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    const pickupLocation = values.pickupLocation.trim();
    const dropoffLocation = values.returnToDifferentLocation
      ? values.dropoffLocation.trim()
      : pickupLocation;

    const params = new URLSearchParams({
      pickupLocation,
      pickupDate: values.pickupDate,
      pickupTime: values.pickupTime,
      dropoffDate: values.dropoffDate,
      dropoffTime: values.dropoffTime,
      driverAge: values.driverAge,
      dropoffLocation,
    });

    router.push(`/cars/results?${params.toString()}`);
  };

  return (
    <>
      <AppHeader />
      <main className="bg-gradient-to-b from-indigo-50 via-white to-slate-50">
        <section className="page-shell py-8 md:py-12 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm">
                <Car className="h-4 w-4" aria-hidden="true" />
                Cars Phase 1
              </div>

              <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 md:text-5xl lg:text-6xl">
                Find the right car for the next leg of your trip
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Plan pickup and return details now. Live car rental booking will appear here once an approved provider is connected.
              </p>

              <div className="mt-7 rounded-3xl border border-indigo-100 bg-white/85 p-5 text-slate-700 shadow-sm backdrop-blur">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-700">
                  Production-safe planning
                </p>
                <p className="mt-3 leading-7">
                  Kurioticket is preparing cars as part of a complete trip flow. This page collects search intent only; it does not display placeholder inventory, unverified prices, or booking claims.
                </p>
              </div>
            </div>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-indigo-950/10 md:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-700">
                    Car search
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-950">
                    Start with trip details
                  </h2>
                </div>
                <span className="rounded-2xl bg-indigo-50 p-3 text-indigo-700">
                  <MapPin className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 grid gap-4" noValidate>
                <FormField label="Pickup location" error={errors.pickupLocation}>
                  <input
                    id="pickupLocation"
                    name="pickupLocation"
                    type="text"
                    value={values.pickupLocation}
                    onChange={(event) => updateValue("pickupLocation", event.target.value)}
                    placeholder="Airport, city, or address"
                    className="focus-ring h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-400"
                  />
                </FormField>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Pickup date" error={errors.pickupDate}>
                    <input
                      id="pickupDate"
                      name="pickupDate"
                      type="date"
                      value={values.pickupDate}
                      onChange={(event) => updateValue("pickupDate", event.target.value)}
                      className="focus-ring h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-indigo-400"
                    />
                  </FormField>

                  <FormField label="Pickup time" error={errors.pickupTime}>
                    <select
                      id="pickupTime"
                      name="pickupTime"
                      value={values.pickupTime}
                      onChange={(event) => updateValue("pickupTime", event.target.value)}
                      className="focus-ring h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-indigo-400"
                    >
                      {timeOptions.map((time) => (
                        <option key={`pickup-${time}`} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Drop-off date" error={errors.dropoffDate}>
                    <input
                      id="dropoffDate"
                      name="dropoffDate"
                      type="date"
                      value={values.dropoffDate}
                      onChange={(event) => updateValue("dropoffDate", event.target.value)}
                      className="focus-ring h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-indigo-400"
                    />
                  </FormField>

                  <FormField label="Drop-off time" error={errors.dropoffTime}>
                    <select
                      id="dropoffTime"
                      name="dropoffTime"
                      value={values.dropoffTime}
                      onChange={(event) => updateValue("dropoffTime", event.target.value)}
                      className="focus-ring h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-indigo-400"
                    >
                      {timeOptions.map((time) => (
                        <option key={`dropoff-${time}`} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>

                {errors.dateRange ? (
                  <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                    {errors.dateRange}
                  </p>
                ) : null}

                <FormField label="Driver age" error={errors.driverAge}>
                  <select
                    id="driverAge"
                    name="driverAge"
                    value={values.driverAge}
                    onChange={(event) => updateValue("driverAge", event.target.value)}
                    className="focus-ring h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-indigo-400"
                  >
                    {driverAgeOptions.map((age) => (
                      <option key={age} value={age}>
                        {age}
                      </option>
                    ))}
                  </select>
                </FormField>

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={values.returnToDifferentLocation}
                    onChange={(event) =>
                      updateValue("returnToDifferentLocation", event.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Return to a different location
                </label>

                {values.returnToDifferentLocation ? (
                  <FormField label="Drop-off location" error={errors.dropoffLocation}>
                    <input
                      id="dropoffLocation"
                      name="dropoffLocation"
                      type="text"
                      value={values.dropoffLocation}
                      onChange={(event) => updateValue("dropoffLocation", event.target.value)}
                      placeholder="Airport, city, or address"
                      className="focus-ring h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-400"
                    />
                  </FormField>
                ) : null}

                <button
                  type="submit"
                  className="focus-ring mt-2 inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700"
                >
                  Continue to cars results
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </form>
            </section>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {trustCards.map((card) => {
              const Icon = card.icon;

              return (
                <article
                  key={card.title}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <span className="inline-flex rounded-2xl bg-violet-50 p-3 text-violet-700">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-lg font-bold text-slate-950">{card.title}</h3>
                  <p className="mt-2 leading-7 text-slate-600">{card.description}</p>
                </article>
              );
            })}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function CarsPageShell() {
  return (
    <>
      <AppHeader />
      <main className="bg-gradient-to-b from-indigo-50 via-white to-slate-50">
        <section className="page-shell py-16">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3 text-slate-600">
              <Clock className="h-5 w-5 animate-pulse text-indigo-600" aria-hidden="true" />
              Preparing car search...
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function FormField({
  children,
  error,
  label,
}: {
  children: ReactNode;
  error?: string;
  label: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-800">{label}</label>
      {children}
      {error ? <p className="mt-2 text-sm font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}
