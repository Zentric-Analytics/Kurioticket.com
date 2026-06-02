"use client";

import {
  FormEvent,
  ReactNode,
  Suspense,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  RotateCcw,
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
    description: "Plan flights, stays, and ground transportation in one Kurioticket flow.",
    icon: CheckCircle2,
  },
  {
    title: "Pickup details first",
    description:
      "Capture location, dates, times, and driver age before provider-backed car results are connected.",
    icon: CalendarClock,
  },
  {
    title: "No placeholder pricing",
    description:
      "Kurioticket only shows vehicle inventory and rental prices after a live provider is approved.",
    icon: ShieldCheck,
  },
];

const getSearchParam = (params: URLSearchParams | null, key: string) =>
  params?.get(key)?.trim() ?? "";

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

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

const validateCarsForm = (
  values: CarsFormValues,
  todayIso: string,
): CarsFormErrors => {
  const errors: CarsFormErrors = {};
  const pickupLocation = values.pickupLocation.trim();
  const dropoffLocation = values.dropoffLocation.trim();
  const driverAge = Number.parseInt(values.driverAge, 10);

  if (!pickupLocation) {
    errors.pickupLocation = "Enter a pickup location.";
  }

  if (!values.pickupDate) {
    errors.pickupDate = "Select a pickup date.";
  } else if (values.pickupDate < todayIso) {
    errors.pickupDate = "Pickup date cannot be in the past.";
  }

  if (!values.pickupTime) {
    errors.pickupTime = "Select a pickup time.";
  }

  if (!values.dropoffDate) {
    errors.dropoffDate = "Select a drop-off date.";
  } else if (values.dropoffDate < todayIso) {
    errors.dropoffDate = "Drop-off date cannot be in the past.";
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
  const todayIso = useMemo(() => toIsoDate(new Date()), []);
  const [values, setValues] = useState<CarsFormValues>(initialValues);
  const [errors, setErrors] = useState<CarsFormErrors>({});

  const hasActiveSearch =
    values.pickupLocation.trim() ||
    values.pickupDate ||
    values.dropoffDate ||
    values.driverAge !== "30" ||
    values.returnToDifferentLocation ||
    values.dropoffLocation.trim();

  const updateValue = <Key extends keyof CarsFormValues>(
    key: Key,
    value: CarsFormValues[Key],
  ) => {
    setValues((current) => {
      const next = { ...current, [key]: value };

      if (key === "returnToDifferentLocation" && value === false) {
        next.dropoffLocation = "";
      }

      return next;
    });

    setErrors((current) => ({
      ...current,
      [key]: undefined,
      dateRange: undefined,
      ...(key === "returnToDifferentLocation" ? { dropoffLocation: undefined } : {}),
    }));
  };

  const clearSearch = () => {
    setValues({
      pickupLocation: "",
      pickupDate: "",
      pickupTime: "10:00",
      dropoffDate: "",
      dropoffTime: "10:00",
      driverAge: "30",
      returnToDifferentLocation: false,
      dropoffLocation: "",
    });
    setErrors({});
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateCarsForm(values, todayIso);
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
      <main className="page-shell relative isolate flex-1 overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#f6f7fb_48%,#f8fafc_100%)] pb-16 pt-8 sm:pt-10 lg:pt-12">
        <div className="pointer-events-none absolute left-1/2 top-10 -z-10 h-64 w-[min(50rem,88vw)] -translate-x-1/2 rounded-full bg-white/55 blur-3xl" />
        <div className="pointer-events-none absolute -right-28 bottom-28 -z-10 h-80 w-80 rounded-full bg-slate-200/14 blur-3xl" />

        <div className="relative mx-auto max-w-6xl space-y-8 md:space-y-10">
          <section className="space-y-4" aria-labelledby="cars-search-heading">
            <div className="px-1">
              <h1
                id="cars-search-heading"
                className="text-[2rem] font-black leading-[1.04] tracking-[-0.04em] text-slate-950 md:text-[2.35rem] lg:whitespace-nowrap lg:text-[2.5rem] xl:text-[2.7rem]"
              >
                Search rental cars for every part of your trip
              </h1>
            </div>

            <CarsSearchBar
              errors={errors}
              hasActiveSearch={Boolean(hasActiveSearch)}
              onClearSearch={clearSearch}
              onSubmit={handleSubmit}
              todayIso={todayIso}
              updateValue={updateValue}
              values={values}
            />
          </section>

          <section className="relative isolate rounded-[1.5rem] border border-slate-200/75 bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(248,250,252,0.72)_54%,rgba(241,245,249,0.58))] p-2 shadow-[0_24px_64px_-52px_rgba(15,23,42,0.34)] ring-1 ring-white/80 sm:rounded-[2rem] sm:p-4">
            <div className="grid gap-2.5 sm:gap-4 md:grid-cols-3">
              {trustCards.map((card) => {
                const Icon = card.icon;

                return (
                  <article
                    key={card.title}
                    className="relative isolate cursor-default overflow-hidden rounded-[1rem] border border-slate-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.82),rgba(248,250,252,0.7)_58%,rgba(241,245,249,0.78))] p-4 shadow-[0_14px_34px_-32px_rgba(15,23,42,0.38)] ring-1 ring-white/70 backdrop-blur-sm sm:rounded-[1.5rem] sm:p-6"
                  >
                    <div className="pointer-events-none absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/80 to-transparent" />
                    <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-slate-200/30 blur-3xl" />
                    <div
                      className="relative mb-4 inline-flex h-11 w-11 items-center justify-center rounded-[1rem] border border-indigo-200/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(238,242,255,0.72)_52%,rgba(248,250,252,0.92))] text-indigo-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_22px_-18px_rgba(79,70,229,0.55),0_8px_18px_-20px_rgba(15,23,42,0.55)] sm:mb-5 sm:h-12 sm:w-12"
                      aria-hidden="true"
                    >
                      <Icon className="h-5 w-5 stroke-[1.8]" />
                    </div>
                    <h2 className="relative text-base font-semibold leading-snug tracking-[-0.01em] text-slate-800">
                      {card.title}
                    </h2>
                    <p className="relative mt-2 text-sm leading-6 text-slate-700">
                      {card.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-indigo-100 bg-white/86 p-5 shadow-[0_16px_44px_-38px_rgba(15,23,42,0.28)] ring-1 ring-white/80 md:p-6">
            <div className="flex gap-3">
              <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-indigo-600" aria-hidden="true" />
              <p className="max-w-3xl text-sm leading-6 text-slate-700 md:text-base md:leading-7">
                This Cars page is production-safe: it collects search intent and routes to a preserved results shell, but it does not show rental inventory, prices, provider names, ratings, availability, or booking claims until a live car rental provider is approved.
              </p>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

function CarsSearchBar({
  errors,
  hasActiveSearch,
  onClearSearch,
  onSubmit,
  todayIso,
  updateValue,
  values,
}: {
  errors: CarsFormErrors;
  hasActiveSearch: boolean;
  onClearSearch: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  todayIso: string;
  updateValue: <Key extends keyof CarsFormValues>(
    key: Key,
    value: CarsFormValues[Key],
  ) => void;
  values: CarsFormValues;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_10px_28px_rgba(15,23,42,0.10)]">
      <form onSubmit={onSubmit} className="space-y-2" noValidate>
        <div className="flex flex-wrap items-center justify-end gap-2 px-1">
          <label className="focus-within:ring-ring inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={values.returnToDifferentLocation}
              onChange={(event) =>
                updateValue("returnToDifferentLocation", event.target.checked)
              }
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Different return location
          </label>

          {hasActiveSearch ? (
            <button
              type="button"
              onClick={onClearSearch}
              className="focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Clear all
            </button>
          ) : null}
        </div>

        <div className="overflow-visible rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_10px_28px_rgba(15,23,42,0.10)]">
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,2.15fr)_minmax(15rem,1.5fr)_minmax(15rem,1.5fr)_minmax(6.75rem,0.7fr)_110px] lg:gap-0">
            <SearchCell
              label="Pickup"
              error={errors.pickupLocation || errors.dropoffLocation}
              className="lg:rounded-r-none lg:border-r lg:border-r-slate-200/80"
            >
              <div className="grid gap-2">
                <input
                  id="pickupLocation"
                  name="pickupLocation"
                  type="text"
                  value={values.pickupLocation}
                  onChange={(event) => updateValue("pickupLocation", event.target.value)}
                  placeholder="Airport, city, or address"
                  className="h-8 w-full border-none bg-transparent p-0 text-[16px] font-semibold text-slate-950 placeholder:text-slate-400 focus:outline-none md:text-sm"
                  autoComplete="off"
                />

                {values.returnToDifferentLocation ? (
                  <input
                    id="dropoffLocation"
                    name="dropoffLocation"
                    type="text"
                    value={values.dropoffLocation}
                    onChange={(event) =>
                      updateValue("dropoffLocation", event.target.value)
                    }
                    placeholder="Return city, airport, or address"
                    className="h-8 w-full border-t border-slate-100 bg-transparent p-0 pt-2 text-[16px] font-semibold text-slate-950 placeholder:text-slate-400 focus:outline-none md:text-sm"
                    autoComplete="off"
                  />
                ) : (
                  <p className="truncate border-t border-slate-100 pt-2 text-sm font-semibold text-slate-500">
                    Return to same location
                  </p>
                )}
              </div>
            </SearchCell>

            <SearchCell
              label="Pickup date / time"
              error={errors.pickupDate || errors.pickupTime}
              className="lg:rounded-none lg:border-x lg:border-x-slate-200/80"
            >
              <DateTimeInputs
                dateId="pickupDate"
                dateName="pickupDate"
                dateValue={values.pickupDate}
                minDate={todayIso}
                onDateChange={(value) => updateValue("pickupDate", value)}
                onTimeChange={(value) => updateValue("pickupTime", value)}
                timeId="pickupTime"
                timeName="pickupTime"
                timeValue={values.pickupTime}
              />
            </SearchCell>

            <SearchCell
              label="Return date / time"
              error={errors.dropoffDate || errors.dropoffTime || errors.dateRange}
              className="lg:rounded-none lg:border-r lg:border-r-slate-200/80"
            >
              <DateTimeInputs
                dateId="dropoffDate"
                dateName="dropoffDate"
                dateValue={values.dropoffDate}
                minDate={values.pickupDate || todayIso}
                onDateChange={(value) => updateValue("dropoffDate", value)}
                onTimeChange={(value) => updateValue("dropoffTime", value)}
                timeId="dropoffTime"
                timeName="dropoffTime"
                timeValue={values.dropoffTime}
              />
            </SearchCell>

            <SearchCell
              label="Driver age"
              error={errors.driverAge}
              className="lg:rounded-l-none"
            >
              <select
                id="driverAge"
                name="driverAge"
                value={values.driverAge}
                onChange={(event) => updateValue("driverAge", event.target.value)}
                className="h-8 w-full border-none bg-transparent p-0 text-[16px] font-semibold text-slate-950 focus:outline-none md:text-sm"
              >
                {driverAgeOptions.map((age) => (
                  <option key={age} value={age}>
                    {age}
                  </option>
                ))}
              </select>
            </SearchCell>

            <div className="sm:col-span-2 lg:col-span-1">
              <button
                type="submit"
                className="focus-ring inline-flex h-full min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 active:bg-indigo-700 lg:rounded-l-none"
              >
                Search
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}

function CarsPageShell() {
  return (
    <>
      <AppHeader />
      <main className="page-shell bg-[linear-gradient(180deg,#f8fafc_0%,#f6f7fb_48%,#f8fafc_100%)] py-16">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 text-slate-600">
            <Clock className="h-5 w-5 animate-pulse text-indigo-600" aria-hidden="true" />
            Preparing car search...
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function DateTimeInputs({
  dateId,
  dateName,
  dateValue,
  minDate,
  onDateChange,
  onTimeChange,
  timeId,
  timeName,
  timeValue,
}: {
  dateId: string;
  dateName: string;
  dateValue: string;
  minDate: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  timeId: string;
  timeName: string;
  timeValue: string;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(9rem,1fr)_minmax(6.25rem,0.62fr)]">
      <label className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 px-2.5 py-1.5 transition focus-within:border-indigo-200 focus-within:bg-white">
        <span className="mb-0.5 block text-[0.65rem] font-bold uppercase tracking-wide text-slate-400">
          Date
        </span>
        <input
          id={dateId}
          name={dateName}
          type="date"
          min={minDate}
          value={dateValue}
          onChange={(event) => onDateChange(event.target.value)}
          className="h-7 w-full min-w-[8.5rem] border-none bg-transparent p-0 text-[16px] font-semibold text-slate-950 focus:outline-none md:text-sm"
        />
      </label>

      <label className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 px-2.5 py-1.5 transition focus-within:border-indigo-200 focus-within:bg-white">
        <span className="mb-0.5 block text-[0.65rem] font-bold uppercase tracking-wide text-slate-400">
          Time
        </span>
        <select
          id={timeId}
          name={timeName}
          value={timeValue}
          onChange={(event) => onTimeChange(event.target.value)}
          className="h-7 w-full min-w-[5.25rem] border-none bg-transparent p-0 text-[16px] font-semibold text-slate-950 focus:outline-none md:text-sm"
        >
          {timeOptions.map((time) => (
            <option key={`${timeId}-${time}`} value={time}>
              {time}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function SearchCell({
  children,
  className = "",
  error,
  label,
}: {
  children: ReactNode;
  className?: string;
  error?: string;
  label: string;
}) {
  return (
    <div
      className={`min-h-[84px] rounded-xl border border-transparent bg-white px-3 py-2.5 transition hover:border-slate-200 focus-within:border-indigo-200 focus-within:bg-indigo-50/20 ${className}`}
    >
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs font-semibold leading-4 text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
