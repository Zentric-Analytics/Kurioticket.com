"use client";

import Link from "next/link";
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

type CarPickupCard = {
  title: string;
  subtitle: string;
  pickupLocation: string;
  image: string;
  imageAlt: string;
};

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

const pickupCards: CarPickupCard[] = [
  {
    title: "Airport pickups",
    subtitle: "Start from major airport arrival points",
    pickupLocation: "Airport",
    image:
      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Airplane parked at an airport gate at sunset",
  },
  {
    title: "City center pickups",
    subtitle: "Pick up near downtown hotels and business districts",
    pickupLocation: "City center",
    image:
      "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Cars driving through a city street between tall buildings",
  },
  {
    title: "Train station pickups",
    subtitle: "Continue your trip after rail arrivals",
    pickupLocation: "Train station",
    image:
      "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Train platform with tracks leading into a city station",
  },
  {
    title: "Hotel area pickups",
    subtitle: "Plan a car pickup near where you are staying",
    pickupLocation: "Hotel area",
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Hotel exterior with palm trees and a driveway",
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

const formatDisplayDate = (isoDate: string) => {
  if (!isoDate) {
    return "Select date";
  }

  const [year, month, day] = isoDate.split("-").map(Number);

  if (!year || !month || !day) {
    return "Select date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next;
};

const buildPickupHref = (pickupLocation: string) => {
  const today = new Date();
  const pickupDate = toIsoDate(addDays(today, 14));
  const dropoffDate = toIsoDate(addDays(today, 17));

  return `/cars/results?${new URLSearchParams({
    pickupLocation,
    pickupDate,
    pickupTime: "10:00",
    dropoffDate,
    dropoffTime: "10:00",
    driverAge: "30",
    dropoffLocation: pickupLocation,
  }).toString()}`;
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

          <section className="space-y-4" aria-labelledby="car-pickup-ideas-heading">
            <div className="flex flex-col gap-2 px-1 md:flex-row md:items-end md:justify-between">
              <div>
                <h2
                  id="car-pickup-ideas-heading"
                  className="text-[1.2rem] font-semibold leading-[1.2] tracking-[-0.012em] text-slate-800 md:text-[1.85rem]"
                >
                  Start with popular car pickup points
                </h2>
                <p className="mt-1.5 max-w-xl text-sm leading-6 text-slate-600 md:text-base">
                  Choose a pickup style and we’ll open the cars results page with search details ready.
                </p>
              </div>
            </div>

            <div className="border border-slate-200/80 bg-white/80 p-3 shadow-[0_16px_44px_-40px_rgba(15,23,42,0.26)] ring-1 ring-white/80 sm:p-6 md:p-7">
              <div className="grid auto-cols-[minmax(240px,82vw)] grid-flow-col gap-4 overflow-x-auto px-1 pb-3 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] md:grid-flow-row md:auto-cols-auto md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 md:pt-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
                {pickupCards.map((card) => (
                  <CarPickupCardLink key={card.title} card={card} />
                ))}
              </div>
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
    <section className="border border-slate-200/80 bg-white/80 p-3 shadow-[0_16px_44px_-40px_rgba(15,23,42,0.28)] ring-1 ring-white/80 sm:p-4">
      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        <div className="overflow-visible border border-slate-200 bg-white p-1 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.8fr)_minmax(8.6rem,0.78fr)_minmax(6.3rem,0.56fr)_minmax(8.6rem,0.78fr)_minmax(6.3rem,0.56fr)_minmax(5.7rem,0.46fr)_104px] lg:gap-0">
            <SearchCell
              label="Pickup"
              error={errors.pickupLocation || errors.dropoffLocation}
              className="lg:border-r lg:border-r-slate-200/80"
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
              label="Pickup date"
              error={errors.pickupDate}
              className="lg:border-x lg:border-x-slate-200/80"
            >
              <DateInputBox
                id="pickupDate"
                name="pickupDate"
                value={values.pickupDate}
                minDate={todayIso}
                onChange={(value) => updateValue("pickupDate", value)}
              />
            </SearchCell>

            <SearchCell label="Pickup time" error={errors.pickupTime}>
              <TimeSelect
                id="pickupTime"
                name="pickupTime"
                value={values.pickupTime}
                onChange={(value) => updateValue("pickupTime", value)}
              />
            </SearchCell>

            <SearchCell
              label="Return date"
              error={errors.dropoffDate || errors.dateRange}
              className="lg:border-x lg:border-x-slate-200/80"
            >
              <DateInputBox
                id="dropoffDate"
                name="dropoffDate"
                value={values.dropoffDate}
                minDate={values.pickupDate || todayIso}
                onChange={(value) => updateValue("dropoffDate", value)}
              />
            </SearchCell>

            <SearchCell label="Return time" error={errors.dropoffTime}>
              <TimeSelect
                id="dropoffTime"
                name="dropoffTime"
                value={values.dropoffTime}
                onChange={(value) => updateValue("dropoffTime", value)}
              />
            </SearchCell>

            <SearchCell label="Driver age" error={errors.driverAge}>
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
                className="focus-ring inline-flex h-full min-h-14 w-full items-center justify-center gap-2 bg-indigo-600 px-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 active:bg-indigo-700"
              >
                Search
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <label className="focus-within:ring-ring inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-slate-900">
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
              className="focus-ring inline-flex items-center gap-1.5 px-2 py-1 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Clear all
            </button>
          ) : null}
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

function CarPickupCardLink({ card }: { card: CarPickupCard }) {
  return (
    <Link
      href={buildPickupHref(card.pickupLocation)}
      aria-label={`Open car results for ${card.pickupLocation} pickup`}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_28px_-26px_rgba(15,23,42,0.34)] transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_14px_30px_-26px_rgba(15,23,42,0.38)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/70 focus-visible:ring-offset-4 focus-visible:ring-offset-white"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <img
          src={card.image}
          alt={card.imageAlt}
          className="h-full w-full object-cover saturate-[1.08] contrast-[1.02] transition duration-700 group-hover:scale-[1.03] group-hover:saturate-[1.12]"
        />
        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-slate-900/5" />
      </div>
      <div className="p-4 md:p-5">
        <p className="text-lg font-semibold leading-tight tracking-[-0.012em] text-slate-900 md:text-xl">
          {card.title}
        </p>
        <p className="mt-2 text-sm font-medium leading-5 text-slate-600">
          {card.subtitle}
        </p>
      </div>
    </Link>
  );
}

function DateInputBox({
  id,
  minDate,
  name,
  onChange,
  value,
}: {
  id: string;
  minDate: string;
  name: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="relative block h-8 cursor-pointer overflow-hidden text-sm font-semibold text-slate-950">
      <span className={value ? "text-slate-950" : "text-slate-400"}>
        {formatDisplayDate(value)}
      </span>
      <input
        id={id}
        name={name}
        type="date"
        min={minDate}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-label={name}
      />
    </label>
  );
}

function TimeSelect({
  id,
  name,
  onChange,
  value,
}: {
  id: string;
  name: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-8 w-full border-none bg-transparent p-0 text-[16px] font-semibold text-slate-950 focus:outline-none md:text-sm"
    >
      {timeOptions.map((time) => (
        <option key={`${id}-${time}`} value={time}>
          {time}
        </option>
      ))}
    </select>
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
      className={`min-h-[78px] border border-transparent bg-white px-3 py-2.5 transition hover:border-slate-200 focus-within:border-indigo-200 focus-within:bg-indigo-50/20 ${className}`}
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
