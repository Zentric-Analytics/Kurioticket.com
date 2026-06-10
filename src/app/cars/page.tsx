"use client";

import Link from "next/link";
import {
  FormEvent,
  ReactNode,
  RefObject,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  RotateCcw,
  ShieldCheck,
  X,
} from "lucide-react";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRouteProgress } from "@/components/layout/RouteProgress";
import { translations as enTranslations } from "@/lib/i18n/en";

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

type CarsFormErrors = Partial<
  Record<keyof CarsFormValues | "dateRange", string>
>;

type CarImageCard = {
  title: string;
  subtitle: string;
  pickupLocation: string;
  image: string;
  imageAlt: string;
  ariaLabel: string;
  cta?: string;
  vehicleType?: string;
};

type CarPickupCard = Omit<CarImageCard, "ariaLabel" | "vehicleType">;

const defaultDriverAge = "18-70";
const defaultDriverAgeLabel = "Any age 18–70";
const minimumDriverAge = 18;
const maximumDriverAge = 70;

const specificDriverAgeOptions = Array.from(
  { length: maximumDriverAge - minimumDriverAge + 1 },
  (_, index) => String(minimumDriverAge + index),
);

const driverAgeOptions = [defaultDriverAge, ...specificDriverAgeOptions];

const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? "00" : "30";

  return `${String(hour).padStart(2, "0")}:${minute}`;
});

const tripStyleCards: CarImageCard[] = [
  {
    title: "Economy cars",
    subtitle: "Affordable city and solo-trip searches",
    pickupLocation: "City center",
    vehicleType: "economy",
    cta: "Start an economy car search",
    image:
      "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Compact city cars traveling between downtown buildings",
    ariaLabel: "Start an economy car search from City center pickup",
  },
  {
    title: "SUVs",
    subtitle: "Room for family trips, luggage, and longer drives",
    pickupLocation: "Airport",
    vehicleType: "suv",
    cta: "Open SUV rental search",
    image:
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "SUV driving along an open road near mountains",
    ariaLabel: "Open SUV rental search from Airport pickup",
  },
  {
    title: "Luxury cars",
    subtitle: "Premium search context for business or special trips",
    pickupLocation: "Hotel area",
    vehicleType: "luxury",
    cta: "Plan a luxury car search",
    image:
      "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Premium car parked near an elegant modern building",
    ariaLabel: "Plan a luxury car search from Hotel area pickup",
  },
  {
    title: "Vans",
    subtitle: "Search context for group travel and family luggage",
    pickupLocation: "Airport",
    vehicleType: "van",
    cta: "Search vans for group trips",
    image:
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Passenger van traveling through a bright scenic road",
    ariaLabel: "Search vans for group trips from Airport pickup",
  },
];

const trustCards = [
  {
    title: "Built for complete trips",
    description:
      "Plan flights, stays, and ground transportation in one Kurioticket flow.",
    icon: CheckCircle2,
  },
  {
    title: "Pickup details first",
    description:
      "Enter pickup location, dates, times, and driver age so your rental search starts with the right trip details.",
    icon: CalendarClock,
  },
  {
    title: "Clear rental review",
    description:
      "Review final price, availability, fees, and rental rules with the provider before booking.",
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

const carsFaqItems = [
  {
    question: "What information do I need to search for a rental car?",
    answer:
      "Enter your pickup location, pickup and return dates, pickup and return times, driver age, and whether you plan to return the car to a different location.",
  },
  {
    question: "Can I return the car to a different location?",
    answer:
      "Yes. Select Different return location in the search form and enter the drop-off city, airport, or address where you plan to return the car.",
  },
  {
    question: "Why does driver age matter for rental cars?",
    answer:
      "Rental providers may apply different rules, fees, vehicle eligibility, or deposit requirements based on the driver’s age and location.",
  },
  {
    question: "What should I check before booking a rental car?",
    answer:
      "Review the pickup and return location, dates, times, mileage policy, fuel policy, insurance options, cancellation terms, deposit requirements, and required documents before booking.",
  },
  {
    question: "Where is the final rental price confirmed?",
    answer:
      "Final price, vehicle availability, taxes, fees, deposit requirements, and rental rules are confirmed by the provider before booking.",
  },
  {
    question: "What documents might I need at pickup?",
    answer:
      "Rental providers may require a valid driver’s license, payment card, proof of identity, and any documents required by the pickup country or location.",
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
    return "";
  }

  const [year, month, day] = isoDate.split("-").map(Number);

  if (!year || !month || !day) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
};

const parseIsoDate = (value: string) => {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfLocalDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const isBeforeToday = (date: Date) =>
  startOfLocalDay(date).getTime() < startOfLocalDay(new Date()).getTime();

const addMonths = (date: Date, offset: number) =>
  new Date(date.getFullYear(), date.getMonth() + offset, 1);

type MonthCell = {
  date: Date;
  isCurrentMonth: boolean;
};

const buildMonthCells = (monthDate: Date): MonthCell[] => {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startOffset = firstDay.getDay();
  const startDate = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    1 - startOffset,
  );

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate() + index,
    );

    return {
      date,
      isCurrentMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
};

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next;
};

const normalizeDriverAge = (value: string) => {
  const trimmedValue = value.trim();

  return driverAgeOptions.includes(trimmedValue)
    ? trimmedValue
    : defaultDriverAge;
};

const getDriverAgeOptionLabel = (age: string) =>
  age === defaultDriverAge ? defaultDriverAgeLabel : age;

const buildCarResultsHref = ({
  pickupLocation,
  vehicleType,
}: {
  pickupLocation: string;
  vehicleType?: string;
}) => {
  const today = new Date();
  const pickupDate = toIsoDate(addDays(today, 14));
  const dropoffDate = toIsoDate(addDays(today, 17));
  const params = new URLSearchParams({
    pickupLocation,
    pickupDate,
    pickupTime: "10:00",
    dropoffDate,
    dropoffTime: "10:00",
    driverAge: defaultDriverAge,
    dropoffLocation: pickupLocation,
  });

  if (vehicleType) {
    params.set("vehicleType", vehicleType);
  }

  return `/cars/results?${params.toString()}`;
};

const buildPickupHref = (pickupLocation: string) =>
  buildCarResultsHref({ pickupLocation });

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
    driverAge: normalizeDriverAge(getSearchParam(params, "driverAge")),
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
  const hasDefaultDriverAge = values.driverAge === defaultDriverAge;

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

  if (
    !hasDefaultDriverAge &&
    (!values.driverAge ||
      Number.isNaN(driverAge) ||
      String(driverAge) !== values.driverAge ||
      driverAge < minimumDriverAge ||
      driverAge > maximumDriverAge)
  ) {
    errors.driverAge = "Select Any age 18–70 or a driver age from 18 to 70.";
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
      errors.dateRange =
        "For same-day returns, drop-off time must be after pickup time.";
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
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const translateCarImageCard = (card: CarImageCard | CarPickupCard): CarImageCard => {
    const key = "vehicleType" in card && card.vehicleType ? `carsTripStyle.${card.vehicleType}` : `carsPickup.${card.pickupLocation}`;

    return {
      ...card,
      title: dictionary[`${key}.title`] ?? enTranslations[`${key}.title`] ?? card.title,
      subtitle:
        dictionary[`${key}.subtitle`] ??
        enTranslations[`${key}.subtitle`] ??
        card.subtitle,
      cta: card.cta
        ? dictionary[`${key}.cta`] ?? enTranslations[`${key}.cta`] ?? card.cta
        : card.cta,
      ariaLabel:
        dictionary[`${key}.ariaLabel`] ??
        enTranslations[`${key}.ariaLabel`] ??
        ("ariaLabel" in card
          ? card.ariaLabel
          : `Open car results for ${card.pickupLocation} pickup`),
    };
  };
  const router = useRouter();
  const { start: startRouteProgress } = useRouteProgress();
  const searchParams = useSearchParams();
  const initialValues = useMemo(
    () => getInitialValues(searchParams),
    [searchParams],
  );
  const todayIso = useMemo(() => toIsoDate(new Date()), []);
  const [values, setValues] = useState<CarsFormValues>(initialValues);
  const [errors, setErrors] = useState<CarsFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasActiveSearch =
    values.pickupLocation.trim() ||
    values.pickupDate ||
    values.dropoffDate ||
    values.driverAge !== defaultDriverAge ||
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
      ...(key === "returnToDifferentLocation"
        ? { dropoffLocation: undefined }
        : {}),
    }));
  };

  const clearSearch = () => {
    setValues({
      pickupLocation: "",
      pickupDate: "",
      pickupTime: "10:00",
      dropoffDate: "",
      dropoffTime: "10:00",
      driverAge: defaultDriverAge,
      returnToDifferentLocation: false,
      dropoffLocation: "",
    });
    setErrors({});
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

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

    setIsSubmitting(true);
    startRouteProgress();
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
                className="text-[1.5rem] font-semibold leading-[1.12] tracking-[-0.02em] text-slate-900 md:text-[1.8rem] lg:whitespace-nowrap lg:text-[2rem] xl:text-[2.1rem]"
              >
                {t("searchRentalCarsEveryPartTrip")}
              </h1>
            </div>

            <CarsSearchBar
              errors={errors}
              hasActiveSearch={Boolean(hasActiveSearch)}
              onClearSearch={clearSearch}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              updateValue={updateValue}
              values={values}
            />
          </section>

          <section
            className="space-y-4"
            aria-labelledby="car-trip-style-heading"
          >
            <div className="flex flex-col gap-2 px-1 md:flex-row md:items-end md:justify-between">
              <div>
                <h2
                  id="car-trip-style-heading"
                  className="text-lg font-semibold leading-[1.2] tracking-[-0.012em] text-slate-800 md:text-2xl"
                >
                  {t("exploreCarsByTripStyle")}
                </h2>
                <p className="mt-1.5 max-w-xl text-sm leading-6 text-slate-600 md:text-base">
                  {t("carsTripStyleBody")}
                </p>
              </div>
            </div>

            <div className="border border-slate-200/80 bg-white/80 p-3 shadow-[0_16px_44px_-40px_rgba(15,23,42,0.26)] ring-1 ring-white/80 sm:p-6 md:p-7">
              <div className="grid auto-cols-[minmax(240px,82vw)] grid-flow-col gap-4 overflow-x-auto px-1 pb-3 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] md:grid-flow-row md:auto-cols-auto md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 md:pt-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
                {tripStyleCards.map((card) => (
                  <CarImageCardLink
                    key={card.title}
                    card={translateCarImageCard(card)}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="relative isolate rounded-[1.5rem] border border-slate-200/75 bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(248,250,252,0.72)_54%,rgba(241,245,249,0.58))] p-2 shadow-[0_24px_64px_-52px_rgba(15,23,42,0.34)] ring-1 ring-white/80 sm:rounded-[2rem] sm:p-4">
            <div className="grid gap-2.5 sm:gap-4 md:grid-cols-3">
              {trustCards.map((card, index) => {
                const Icon = card.icon;
                const translatedTitle =
                  dictionary[`carsTrust.${index}.title`] ??
                  enTranslations[`carsTrust.${index}.title`] ??
                  card.title;
                const translatedDescription =
                  dictionary[`carsTrust.${index}.description`] ??
                  enTranslations[`carsTrust.${index}.description`] ??
                  card.description;

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
                      {translatedTitle}
                    </h2>
                    <p className="relative mt-2 text-sm leading-6 text-slate-700">
                      {translatedDescription}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>

          <section
            className="space-y-4"
            aria-labelledby="car-pickup-ideas-heading"
          >
            <div className="flex flex-col gap-2 px-1 md:flex-row md:items-end md:justify-between">
              <div>
                <h2
                  id="car-pickup-ideas-heading"
                  className="text-lg font-semibold leading-[1.2] tracking-[-0.012em] text-slate-800 md:text-2xl"
                >
                  {t("carsPickupPointsTitle")}
                </h2>
                <p className="mt-1.5 max-w-xl text-sm leading-6 text-slate-600 md:text-base">
                  {t("carsPickupPointsBody")}
                </p>
              </div>
            </div>

            <div className="border border-slate-200/80 bg-white/80 p-3 shadow-[0_16px_44px_-40px_rgba(15,23,42,0.26)] ring-1 ring-white/80 sm:p-6 md:p-7">
              <div className="grid auto-cols-[minmax(240px,82vw)] grid-flow-col gap-4 overflow-x-auto px-1 pb-3 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] md:grid-flow-row md:auto-cols-auto md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 md:pt-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
                {pickupCards.map((card) => (
                  <CarPickupCardLink
                    key={card.title}
                    card={translateCarImageCard(card)}
                  />
                ))}
              </div>
            </div>
          </section>

          <CarsFaqSection />
        </div>
      </main>
      <Footer />
    </>
  );
}

function CarsFaqSection() {
  return (
    <section className="space-y-4 px-1" aria-labelledby="cars-faq-heading">
      <div className="max-w-2xl">
        <h2
          id="cars-faq-heading"
          className="text-lg font-semibold leading-[1.2] tracking-[-0.012em] text-slate-800 md:text-2xl"
        >
          Cars Frequently asked questions
        </h2>
      </div>

      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
        {carsFaqItems.map((item) => (
          <details
            key={item.question}
            className="group rounded-2xl border border-slate-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(248,250,252,0.74))] px-4 py-4 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.34)] ring-1 ring-white/70 transition open:border-indigo-200/80 open:bg-white open:shadow-[0_18px_38px_-32px_rgba(79,70,229,0.36)] sm:px-5"
          >
            <summary className="flex min-h-12 cursor-pointer list-none items-start justify-between gap-3 text-sm font-semibold leading-5 text-slate-900 marker:hidden [&::-webkit-details-marker]:hidden">
              <span>{item.question}</span>
              <span
                className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-sm leading-none text-slate-500 shadow-sm transition group-open:rotate-45 group-open:border-indigo-200 group-open:text-indigo-600"
                aria-hidden="true"
              >
                +
              </span>
            </summary>
            <p className="mt-2.5 text-sm leading-6 text-slate-600">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

function CarsSearchBar({
  errors,
  hasActiveSearch,
  onClearSearch,
  onSubmit,
  isSubmitting,
  updateValue,
  values,
}: {
  errors: CarsFormErrors;
  hasActiveSearch: boolean;
  onClearSearch: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isSubmitting: boolean;
  updateValue: <Key extends keyof CarsFormValues>(
    key: Key,
    value: CarsFormValues[Key],
  ) => void;
  values: CarsFormValues;
}) {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const pickupLocationRef = useRef<HTMLInputElement | null>(null);
  const dropoffLocationRef = useRef<HTMLInputElement | null>(null);
  const dateWrapRef = useRef<HTMLDivElement | null>(null);
  const timeWrapRef = useRef<HTMLDivElement | null>(null);
  const [datesOpen, setDatesOpen] = useState(false);
  const [timesOpen, setTimesOpen] = useState(false);
  const [visibleMonthDate, setVisibleMonthDate] = useState(() => {
    const parsedPickup = parseIsoDate(values.pickupDate);

    if (parsedPickup) {
      return new Date(parsedPickup.getFullYear(), parsedPickup.getMonth(), 1);
    }

    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (datesOpen && !dateWrapRef.current?.contains(target)) {
        setDatesOpen(false);
      }

      if (timesOpen && !timeWrapRef.current?.contains(target)) {
        setTimesOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDatesOpen(false);
        setTimesOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [datesOpen, timesOpen]);

  const toggleDates = () => {
    setDatesOpen((current) => {
      const nextOpen = !current;

      if (nextOpen) {
        setTimesOpen(false);
      }

      return nextOpen;
    });
  };

  const toggleTimes = () => {
    setTimesOpen((current) => {
      const nextOpen = !current;

      if (nextOpen) {
        setDatesOpen(false);
      }

      return nextOpen;
    });
  };

  const selectRentalDate = (date: Date) => {
    if (isBeforeToday(date)) {
      return;
    }

    const selectedIso = toIsoDate(date);

    if (!values.pickupDate || (values.pickupDate && values.dropoffDate)) {
      updateValue("pickupDate", selectedIso);
      updateValue("dropoffDate", "");
      return;
    }

    if (selectedIso < values.pickupDate) {
      updateValue("pickupDate", selectedIso);
      updateValue("dropoffDate", "");
      return;
    }

    updateValue("dropoffDate", selectedIso);
  };

  const clearRentalDates = () => {
    updateValue("pickupDate", "");
    updateValue("dropoffDate", "");
  };

  const dateError = errors.pickupDate || errors.dropoffDate || errors.dateRange;
  const timeError = errors.pickupTime || errors.dropoffTime;

  return (
    <section className="border border-slate-200/80 bg-white/80 p-2.5 shadow-[0_16px_44px_-40px_rgba(15,23,42,0.28)] ring-1 ring-white/80 sm:p-4">
      <form onSubmit={onSubmit} className="space-y-2 sm:space-y-3" noValidate>
        <input type="hidden" name="pickupDate" value={values.pickupDate} />
        <input type="hidden" name="dropoffDate" value={values.dropoffDate} />
        <input type="hidden" name="pickupTime" value={values.pickupTime} />
        <input type="hidden" name="dropoffTime" value={values.dropoffTime} />

        <div className="overflow-visible border border-slate-200 bg-white p-0.5 shadow-[0_10px_28px_rgba(15,23,42,0.08)] sm:p-1">
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-1.5 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1.45fr)_minmax(0,1.1fr)_minmax(5.8rem,0.55fr)_104px] lg:gap-0">
            <SearchCell
              label="Pickup location"
              error={errors.pickupLocation || errors.dropoffLocation}
              className="lg:border-r lg:border-r-slate-200/80"
            >
              <div className="grid gap-2">
                <div className="relative">
                  <input
                    ref={pickupLocationRef}
                    id="pickupLocation"
                    name="pickupLocation"
                    type="text"
                    value={values.pickupLocation}
                    onChange={(event) =>
                      updateValue("pickupLocation", event.target.value)
                    }
                    placeholder="Airport, city, or address"
                    className="h-7 w-full border-none bg-transparent py-0 pl-0 pr-9 text-[16px] font-semibold text-slate-950 placeholder:text-slate-400 focus:outline-none md:text-sm lg:h-8"
                    autoComplete="off"
                  />

                  {values.pickupLocation ? (
                    <button
                      type="button"
                      aria-label="Clear pickup location"
                      onClick={() => {
                        updateValue("pickupLocation", "");
                        pickupLocationRef.current?.focus();
                      }}
                      className="absolute right-0 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 lg:h-8 lg:w-8"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>

                {values.returnToDifferentLocation ? (
                  <div className="relative">
                    <input
                      ref={dropoffLocationRef}
                      id="dropoffLocation"
                      name="dropoffLocation"
                      type="text"
                      value={values.dropoffLocation}
                      onChange={(event) =>
                        updateValue("dropoffLocation", event.target.value)
                      }
                      placeholder="Return city, airport, or address"
                      className="h-7 w-full border-t border-slate-100 bg-transparent py-0 pl-0 pr-9 pt-1.5 text-[16px] font-semibold text-slate-950 placeholder:text-slate-400 focus:outline-none md:text-sm lg:h-8 lg:pt-2"
                      autoComplete="off"
                    />

                    {values.dropoffLocation ? (
                      <button
                        type="button"
                        aria-label="Clear return location"
                        onClick={() => {
                          updateValue("dropoffLocation", "");
                          dropoffLocationRef.current?.focus();
                        }}
                        className="absolute right-0 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 lg:h-8 lg:w-8"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <p className="truncate border-t border-slate-100 pt-1.5 text-sm font-semibold text-slate-500 lg:pt-2">
                    Return to same location
                  </p>
                )}
              </div>
            </SearchCell>

            <SearchCell
              label="Rental dates"
              error={dateError}
              className="relative lg:border-r lg:border-r-slate-200/80"
            >
              <RentalDatesField
                dropoffDate={values.dropoffDate}
                isOpen={datesOpen}
                onClear={clearRentalDates}
                onDone={() => setDatesOpen(false)}
                onNextMonth={() =>
                  setVisibleMonthDate((current) => addMonths(current, 1))
                }
                onPreviousMonth={() =>
                  setVisibleMonthDate((current) => addMonths(current, -1))
                }
                onSelectDate={selectRentalDate}
                onToggle={toggleDates}
                pickupDate={values.pickupDate}
                visibleMonthDate={visibleMonthDate}
                wrapRef={dateWrapRef}
              />
            </SearchCell>

            <SearchCell
              label="Pickup / return time"
              error={timeError}
              className="relative lg:border-r lg:border-r-slate-200/80"
            >
              <TimeRangeField
                isOpen={timesOpen}
                onToggle={toggleTimes}
                pickupTime={values.pickupTime}
                returnTime={values.dropoffTime}
                updateValue={updateValue}
                wrapRef={timeWrapRef}
              />
            </SearchCell>

            <SearchCell label="Driver age" error={errors.driverAge}>
              <select
                id="driverAge"
                name="driverAge"
                value={values.driverAge}
                onChange={(event) =>
                  updateValue("driverAge", event.target.value)
                }
                className="h-7 w-full border-none bg-transparent p-0 text-[16px] font-semibold text-slate-950 focus:outline-none md:text-sm lg:h-8"
              >
                {driverAgeOptions.map((age) => (
                  <option key={age} value={age}>
                    {getDriverAgeOptionLabel(age)}
                  </option>
                ))}
              </select>
            </SearchCell>

            <div className="sm:col-span-2 lg:col-span-1">
              <button
                type="submit"
                className="focus-ring inline-flex h-full min-h-11 w-full items-center justify-center gap-2 bg-indigo-600 px-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 active:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-75 disabled:hover:bg-indigo-600 lg:min-h-12"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? t("searchingCars") : t("search")}
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
            <Clock
              className="h-5 w-5 animate-pulse text-indigo-600"
              aria-hidden="true"
            />
            Preparing car search...
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function CarImageCardLink({ card }: { card: CarImageCard }) {
  return (
    <Link
      href={
        card.vehicleType
          ? buildCarResultsHref({
              pickupLocation: card.pickupLocation,
              vehicleType: card.vehicleType,
            })
          : buildPickupHref(card.pickupLocation)
      }
      aria-label={card.ariaLabel}
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
      <div className="flex flex-1 flex-col p-4 md:p-5">
        <p className="text-base font-semibold leading-tight tracking-[-0.012em] text-slate-900 md:text-lg">
          {card.title}
        </p>
        <p className="mt-2 text-sm font-medium leading-5 text-slate-600">
          {card.subtitle}
        </p>
        {card.cta ? (
          <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 transition-colors group-hover:text-indigo-800">
            {card.cta}
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function CarPickupCardLink({ card }: { card: CarPickupCard }) {
  return (
    <CarImageCardLink
      card={{
        ...card,
        ariaLabel: `Open car results for ${card.pickupLocation} pickup`,
      }}
    />
  );
}

function RentalDatesField({
  dropoffDate,
  isOpen,
  onClear,
  onDone,
  onNextMonth,
  onPreviousMonth,
  onSelectDate,
  onToggle,
  pickupDate,
  visibleMonthDate,
  wrapRef,
}: {
  dropoffDate: string;
  isOpen: boolean;
  onClear: () => void;
  onDone: () => void;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
  onSelectDate: (date: Date) => void;
  onToggle: () => void;
  pickupDate: string;
  visibleMonthDate: Date;
  wrapRef: RefObject<HTMLDivElement | null>;
}) {
  const pickupDisplay = formatDisplayDate(pickupDate);
  const dropoffDisplay = formatDisplayDate(dropoffDate);
  const pickupParsed = parseIsoDate(pickupDate);
  const dropoffParsed = parseIsoDate(dropoffDate);
  const dateSummary = pickupDisplay
    ? dropoffDisplay
      ? `${pickupDisplay} — ${dropoffDisplay}`
      : pickupDisplay
    : "Pickup date — Return date";

  return (
    <div ref={wrapRef}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="Choose rental pickup and return dates"
        className="focus-ring flex h-7 w-full items-center gap-2 rounded-md border-0 bg-transparent px-0 text-left text-[16px] font-semibold text-slate-950 outline-none transition-colors md:text-sm lg:h-8"
      >
        <Calendar
          className="h-4 w-4 shrink-0 text-slate-500"
          aria-hidden="true"
        />
        <span
          className={`truncate ${pickupDate ? "text-slate-950" : "text-slate-400"}`}
        >
          {dateSummary}
        </span>
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-label="Rental date picker"
          className="absolute left-0 right-0 top-[calc(100%+10px)] z-[200] w-full rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_20px_45px_rgba(15,23,42,0.16)] sm:right-auto sm:w-[min(92vw,620px)] sm:p-4"
        >
          <p className="mb-3 text-base font-semibold text-slate-900">
            Choose rental dates
          </p>
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={onPreviousMonth}
              className="focus-ring rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Prev
            </button>
            <button
              type="button"
              aria-label="Next month"
              onClick={onNextMonth}
              className="focus-ring rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Next
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            {[0, 1].map((monthOffset) => {
              const monthDate = addMonths(visibleMonthDate, monthOffset);
              const cells = buildMonthCells(monthDate);

              return (
                <div key={monthOffset}>
                  <p className="mb-1.5 text-center text-sm font-semibold text-slate-800">
                    {monthDate.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <div className="mb-1.5 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-600">
                    {weekdays.map((weekday) => (
                      <span key={weekday}>{weekday}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {cells.map((cell) => {
                      const day = cell.date;
                      const iso = toIsoDate(day);
                      const isPickup = iso === pickupDate;
                      const isDropoff = iso === dropoffDate;
                      const isPastDate = isBeforeToday(day);
                      const isBeforePickup = Boolean(
                        pickupDate && !dropoffDate && iso < pickupDate,
                      );
                      const isInRange = Boolean(
                        pickupParsed &&
                        dropoffParsed &&
                        !isPastDate &&
                        day > pickupParsed &&
                        day < dropoffParsed,
                      );

                      if (!cell.isCurrentMonth) {
                        return (
                          <span
                            key={`placeholder-${iso}`}
                            aria-hidden="true"
                            className="h-8 w-8 justify-self-center"
                          />
                        );
                      }

                      return (
                        <button
                          key={iso}
                          type="button"
                          aria-label={`Select ${day.toLocaleDateString(
                            "en-US",
                            {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}${isBeforePickup ? "; starts a new pickup date" : ""}`}
                          onClick={() => onSelectDate(day)}
                          disabled={isPastDate}
                          className={`focus-ring flex h-8 w-8 items-center justify-center justify-self-center rounded-full text-sm transition-colors disabled:cursor-not-allowed ${
                            isPastDate
                              ? "text-slate-300 hover:bg-transparent"
                              : isBeforePickup
                                ? "text-slate-500 hover:bg-indigo-50"
                                : "text-slate-900 hover:bg-indigo-50"
                          } ${
                            isInRange
                              ? "rounded-md bg-indigo-100 text-indigo-900 hover:bg-indigo-100"
                              : ""
                          } ${
                            isPickup || isDropoff
                              ? "bg-indigo-700 text-white hover:bg-indigo-700"
                              : ""
                          }`}
                        >
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={onClear}
              className="focus-ring rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={onDone}
              className="focus-ring rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TimeRangeField({
  isOpen,
  onToggle,
  pickupTime,
  returnTime,
  updateValue,
  wrapRef,
}: {
  isOpen: boolean;
  onToggle: () => void;
  pickupTime: string;
  returnTime: string;
  updateValue: <Key extends keyof CarsFormValues>(
    key: Key,
    value: CarsFormValues[Key],
  ) => void;
  wrapRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={wrapRef}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Choose pickup and return times"
        className="focus-ring flex h-7 w-full items-center justify-between gap-2 rounded-md border-0 bg-transparent px-0 text-left text-[16px] font-semibold text-slate-950 outline-none transition-colors md:text-sm lg:h-8"
      >
        <span className="truncate">
          {pickupTime} pickup — {returnTime} return
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div
          role="menu"
          aria-label="Pickup and return time selector"
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-[180] w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_14px_32px_rgba(15,23,42,0.14)] sm:right-auto sm:w-[min(92vw,320px)]"
        >
          <div className="grid gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Pickup time
              </span>
              <select
                id="pickupTime"
                value={pickupTime}
                onChange={(event) =>
                  updateValue("pickupTime", event.target.value)
                }
                className="focus-ring h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[16px] font-semibold text-slate-950 outline-none transition focus:border-indigo-300 md:text-sm"
              >
                {timeOptions.map((time) => (
                  <option key={`pickup-${time}`} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Return time
              </span>
              <select
                id="dropoffTime"
                value={returnTime}
                onChange={(event) =>
                  updateValue("dropoffTime", event.target.value)
                }
                className="focus-ring h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[16px] font-semibold text-slate-950 outline-none transition focus:border-indigo-300 md:text-sm"
              >
                {timeOptions.map((time) => (
                  <option key={`return-${time}`} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ) : null}
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
      className={`min-h-[58px] border border-transparent bg-white px-2.5 py-1.5 transition hover:border-slate-200 focus-within:border-indigo-200 focus-within:bg-indigo-50/20 lg:min-h-[66px] lg:px-3 lg:py-2 ${className}`}
    >
      <label className="mb-0.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 lg:mb-1">
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
