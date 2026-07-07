"use client";

import Image from "next/image";
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
import { FlightMobilePickerShell } from "@/components/search/FlightMobilePickerShell";
import { Footer } from "@/components/layout/Footer";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRouteProgress } from "@/components/layout/RouteProgress";
import { getTranslations } from "@/lib/i18n";
import { translations as enTranslations } from "@/lib/i18n/en";
import {
  addMonths,
  buildCarResultsHref,
  buildMonthCells,
  buildPickupHref,
  defaultDriverAge,
  driverAgeOptions,
  getDriverAgeOptionLabel,
  getInitialValues,
  isBeforeToday,
  parseIsoDate,
  timeOptions,
  toIsoDate,
  validateCarsForm,
  type CarsFormErrors,
  type CarsFormValues,
} from "@/lib/cars/carsSearchUtils";
import {
  carsFaqItems,
  pickupCards,
  tripStyleCards,
  type CarImageCard,
  type CarPickupCard,
} from "@/data/carsLandingContent";

const getCarsIntlLocale = (locale: string) => {
  const normalizedLocale = locale.toLowerCase();

  if (normalizedLocale.startsWith("hi")) {
    return "hi-IN";
  }

  if (normalizedLocale.startsWith("tr")) {
    return "tr-TR";
  }

  if (normalizedLocale.startsWith("pl")) {
    return "pl-PL";
  }

  return locale;
};

const formatCarDisplayDate = (isoDate: string, locale: string) => {
  if (!isoDate) {
    return "";
  }

  const [year, month, day] = isoDate.split("-").map(Number);

  if (!year || !month || !day) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
};

const formatCarWeekdays = (locale: string) =>
  Array.from({ length: 7 }, (_, day) =>
    new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
      new Date(2024, 0, 7 + day),
    ),
  );

const formatCarFullDate = (date: Date, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);

const formatTimeRangeSummary = (
  template: string,
  pickupTime: string,
  returnTime: string,
) =>
  template
    .replace("{pickupTime}", pickupTime)
    .replace("{returnTime}", returnTime);

const formatCarTimeLabel = (time: string, locale: string) => {
  const [hourValue, minuteValue] = time.split(":").map(Number);

  if (Number.isNaN(hourValue) || Number.isNaN(minuteValue)) {
    return time;
  }

  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2024, 0, 1, hourValue, minuteValue));
};

const carsHeroImage = tripStyleCards[1].image;

const trustCards = [
  {
    key: "carsTrust.0",
    icon: CheckCircle2,
  },
  {
    key: "carsTrust.1",
    icon: CalendarClock,
  },
  {
    key: "carsTrust.2",
    icon: ShieldCheck,
  },
];

type CarsMobilePicker =
  | "pickupLocation"
  | "dropoffLocation"
  | "dates"
  | "times"
  | "driverAge"
  | null;

type TranslatedCarImageCard = CarImageCard & {
  title: string;
  subtitle: string;
  imageAlt: string;
  ariaLabel: string;
  cta?: string;
};

function useCarsLandingTranslations() {
  const { locale } = useLocale();
  const dictionary = useMemo(() => getTranslations(locale), [locale]);
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";

  return { locale, t, dictionary };
}

const translateCarsFormErrors = (
  errors: CarsFormErrors,
  t: (key: string) => string,
): CarsFormErrors =>
  Object.fromEntries(
    Object.entries(errors).map(([field, errorKey]) => [
      field,
      errorKey ? t(errorKey) : errorKey,
    ]),
  ) as CarsFormErrors;

export default function CarsPage() {
  return (
    <Suspense fallback={<CarsPageShell />}>
      <CarsSearchPage />
    </Suspense>
  );
}

function CarsSearchPage() {
  const { dictionary, t } = useCarsLandingTranslations();
  const translateCarImageCard = (
    card: CarImageCard | CarPickupCard,
  ): TranslatedCarImageCard => {
    const key = card.translationKey;

    return {
      ...card,
      title: dictionary[`${key}.title`] ?? enTranslations[`${key}.title`] ?? "",
      subtitle:
        dictionary[`${key}.subtitle`] ??
        enTranslations[`${key}.subtitle`] ??
        "",
      imageAlt:
        dictionary[`${key}.imageAlt`] ??
        enTranslations[`${key}.imageAlt`] ??
        "",
      cta: card.ctaKey
        ? (dictionary[card.ctaKey] ?? enTranslations[card.ctaKey] ?? "")
        : undefined,
      ariaLabel:
        dictionary[`${key}.ariaLabel`] ??
        enTranslations[`${key}.ariaLabel`] ??
        "",
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
    setErrors(translateCarsFormErrors(nextErrors, t));

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
      <AppHeader mobileHeroOverlay mobileHeroOverlayLowered />
      <main className="relative isolate flex-1 overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#f6f7fb_48%,#f8fafc_100%)] pb-16">
        <div className="pointer-events-none absolute start-1/2 top-10 -z-10 h-64 w-[min(50rem,88vw)] -translate-x-1/2 rounded-full bg-white/55 blur-3xl" />
        <div className="pointer-events-none absolute -right-28 bottom-28 -z-10 h-80 w-80 rounded-full bg-slate-200/14 blur-3xl" />

        <div className="relative mx-auto max-w-6xl sm:max-w-none">
          <section
            className="relative isolate z-20 min-h-[24.25rem] overflow-visible bg-slate-950 sm:hidden"
            aria-labelledby="cars-mobile-search-heading"
          >
            <div className="absolute inset-0 overflow-hidden">
              <Image
                src={carsHeroImage}
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover object-[54%_45%] brightness-[1.03] saturate-[1.08] contrast-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-slate-950/52 via-slate-950/18 to-slate-950/6" />
              <div className="absolute inset-y-0 start-0 w-[84%] bg-gradient-to-r from-slate-950/62 via-slate-950/24 to-transparent" />
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-slate-950/36 via-slate-950/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/44 via-slate-950/12 to-transparent" />
            </div>

            <div className="page-shell relative z-10 flex min-h-[24.25rem] items-start pt-8">
              <div className="max-w-[22.5rem] pe-2 text-start text-white">
                <h1
                  id="cars-mobile-search-heading"
                  className="text-[clamp(1.38rem,6.1vw,2rem)] font-semibold leading-[1.05] tracking-[-0.041em] text-white text-balance drop-shadow-[0_2px_10px_rgba(2,6,23,0.62)]"
                >
                  {t("searchRentalCarsEveryPartTrip")}
                </h1>
              </div>
            </div>

            <div className="page-shell absolute inset-x-0 bottom-[-23rem] z-30">
              <div className="mx-auto max-w-6xl">
                <CarsSearchBar
                  errors={errors}
                  hasActiveSearch={Boolean(hasActiveSearch)}
                  onClearSearch={clearSearch}
                  onSubmit={handleSubmit}
                  isSubmitting={isSubmitting}
                  updateValue={updateValue}
                  values={values}
                />
              </div>
            </div>
          </section>

          <div className="mx-auto mt-8 w-[min(1180px,calc(100%-32px))] space-y-8 sm:mt-0 sm:w-full md:space-y-10">
            <section
              className="relative hidden overflow-visible pb-28 sm:block lg:pb-32"
              aria-labelledby="cars-search-heading"
            >
              <div className="relative isolate min-h-[32rem] bg-slate-950 lg:min-h-[36rem]">
                <div className="absolute inset-0 overflow-hidden">
                  <Image
                    src={carsHeroImage}
                    alt=""
                    fill
                    priority
                    sizes="100vw"
                    className="object-cover object-[56%_45%] brightness-[1.04] saturate-[1.08] contrast-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-950/70 via-slate-950/28 to-slate-950/8" />
                  <div className="absolute inset-y-0 start-0 w-[78%] bg-gradient-to-r from-slate-950/76 via-slate-950/34 to-transparent" />
                  <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-slate-950/42 via-slate-950/12 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-slate-950/72 via-slate-950/24 to-transparent" />
                </div>

                <div className="page-shell relative z-10 flex min-h-[32rem] flex-col items-start pb-36 pt-10 lg:min-h-[36rem] lg:pb-40 lg:pt-14">
                  <div className="max-w-3xl text-start text-white">
                    <h1
                      id="cars-search-heading"
                      className="max-w-[50rem] text-[2.65rem] font-semibold leading-[1.02] tracking-[-0.045em] text-white drop-shadow-[0_3px_18px_rgba(15,23,42,0.62)] lg:text-[3.3rem]"
                    >
                      {t("searchRentalCarsEveryPartTrip")}
                    </h1>
                  </div>
                </div>

                <div className="page-shell absolute inset-x-0 bottom-[-52px] z-30 lg:bottom-[-56px]">
                  <div className="mx-auto max-w-6xl">
                    <CarsSearchBar
                      errors={errors}
                      hasActiveSearch={Boolean(hasActiveSearch)}
                      onClearSearch={clearSearch}
                      onSubmit={handleSubmit}
                      isSubmitting={isSubmitting}
                      updateValue={updateValue}
                      values={values}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section
              className="mx-auto max-w-6xl space-y-4 pt-[25rem] sm:pt-0"
              aria-labelledby="car-trip-style-heading"
            >
              <div className="flex flex-col gap-2 px-1 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2
                    id="car-trip-style-heading"
                    className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl"
                  >
                    {t("exploreCarsByTripStyle")}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-slate-600 sm:text-base">
                    {t("carsTripStyleBody")}
                  </p>
                </div>
              </div>

              <div className="border border-slate-200/80 bg-white/80 p-3 shadow-[0_16px_44px_-40px_rgba(15,23,42,0.26)] ring-1 ring-white/80 sm:p-6 md:p-7">
                <div className="grid auto-cols-[minmax(240px,82vw)] grid-flow-col gap-4 overflow-x-auto px-1 pb-3 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] md:grid-flow-row md:auto-cols-auto md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 md:pt-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
                  {tripStyleCards.map((card) => (
                    <CarImageCardLink
                      key={card.translationKey}
                      card={translateCarImageCard(card)}
                    />
                  ))}
                </div>
              </div>
            </section>

            <section className="relative isolate mx-auto max-w-6xl border-0 bg-transparent p-0 shadow-none ring-0 sm:rounded-[2rem] sm:border sm:border-slate-200/75 sm:bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(248,250,252,0.72)_54%,rgba(241,245,249,0.58))] sm:p-4 sm:shadow-[0_24px_64px_-52px_rgba(15,23,42,0.34)] sm:ring-1 sm:ring-white/80">
              <div className="grid gap-2.5 sm:gap-4 md:grid-cols-3">
                {trustCards.map((card) => {
                  const Icon = card.icon;
                  const translatedTitle =
                    dictionary[`${card.key}.title`] ??
                    enTranslations[`${card.key}.title`] ??
                    "";
                  const translatedDescription =
                    dictionary[`${card.key}.description`] ??
                    enTranslations[`${card.key}.description`] ??
                    "";

                  return (
                    <article
                      key={card.key}
                      className="relative isolate cursor-default overflow-hidden rounded-[1rem] border border-slate-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.82),rgba(248,250,252,0.7)_58%,rgba(241,245,249,0.78))] p-2.5 shadow-[0_14px_34px_-32px_rgba(15,23,42,0.38)] ring-1 ring-white/70 backdrop-blur-sm sm:rounded-[1.5rem] sm:p-6"
                    >
                      <div className="pointer-events-none absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/80 to-transparent" />
                      <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-slate-200/30 blur-3xl" />
                      <div
                        className="relative mb-2.5 inline-flex h-8 w-8 items-center justify-center rounded-[0.8rem] border border-[#004BB8]/15 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(0,75,184,0.08)_52%,rgba(248,250,252,0.92))] text-[#004BB8] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_22px_-18px_rgba(0,75,184,0.28),0_8px_18px_-20px_rgba(15,23,42,0.55)] sm:mb-5 sm:h-12 sm:w-12 sm:rounded-[1rem]"
                        aria-hidden="true"
                      >
                        <Icon className="h-3.5 w-3.5 stroke-[1.8] sm:h-5 sm:w-5" />
                      </div>
                      <h2 className="relative text-base font-bold leading-6 text-slate-950">
                        {translatedTitle}
                      </h2>
                      <p className="relative mt-1 text-sm font-medium leading-6 text-slate-700">
                        {translatedDescription}
                      </p>
                    </article>
                  );
                })}
              </div>
            </section>

            <section
              className="mx-auto max-w-6xl space-y-4"
              aria-labelledby="car-pickup-ideas-heading"
            >
              <div className="flex flex-col gap-2 px-1 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2
                    id="car-pickup-ideas-heading"
                    className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl"
                  >
                    {t("carsPickupPointsTitle")}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-slate-600 sm:text-base">
                    {t("carsPickupPointsBody")}
                  </p>
                </div>
              </div>

              <div className="border border-slate-200/80 bg-white/80 p-3 shadow-[0_16px_44px_-40px_rgba(15,23,42,0.26)] ring-1 ring-white/80 sm:p-6 md:p-7">
                <div className="grid auto-cols-[minmax(240px,82vw)] grid-flow-col gap-4 overflow-x-auto px-1 pb-3 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] md:grid-flow-row md:auto-cols-auto md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 md:pt-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
                  {pickupCards.map((card) => (
                    <CarPickupCardLink
                      key={card.translationKey}
                      card={translateCarImageCard(card)}
                    />
                  ))}
                </div>
              </div>
            </section>

            <CarsFaqSection />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function CarsFaqSection() {
  const { dictionary, t } = useCarsLandingTranslations();

  return (
    <section className="mx-auto max-w-6xl space-y-4 px-1" aria-labelledby="cars-faq-heading">
      <div className="max-w-2xl">
        <h2
          id="cars-faq-heading"
          className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl"
        >
          {t("carsFaq.heading")}
        </h2>
      </div>

      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
        {carsFaqItems.map((item) => {
          const translatedQuestion =
            dictionary[item.questionKey] ??
            enTranslations[item.questionKey] ??
            "";
          const translatedAnswer =
            dictionary[item.answerKey] ?? enTranslations[item.answerKey] ?? "";

          return (
            <details
              key={item.id}
              className="group rounded-2xl border border-slate-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(248,250,252,0.74))] px-3.5 py-3 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.34)] ring-1 ring-white/70 transition open:border-[#004BB8]/25 open:bg-white open:shadow-[0_18px_38px_-32px_rgba(0,75,184,0.20)] sm:px-5 sm:py-4"
            >
              <summary className="flex min-h-10 cursor-pointer list-none items-start justify-between gap-3 text-sm font-bold leading-5 text-slate-950 marker:hidden sm:min-h-12 [&::-webkit-details-marker]:hidden">
                <span>{translatedQuestion}</span>
                <span
                  className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-sm leading-none text-slate-500 shadow-sm transition group-open:rotate-45 group-open:border-[#004BB8]/25 group-open:text-[#004BB8]"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600 sm:mt-2.5">
                {translatedAnswer}
              </p>
            </details>
          );
        })}
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
  const { t } = useCarsLandingTranslations();
  const pickupLocationRef = useRef<HTMLInputElement | null>(null);
  const dropoffLocationRef = useRef<HTMLInputElement | null>(null);
  const pickupLocationLauncherRef = useRef<HTMLButtonElement | null>(null);
  const dropoffLocationLauncherRef = useRef<HTMLButtonElement | null>(null);
  const datesLauncherRef = useRef<HTMLButtonElement | null>(null);
  const timesLauncherRef = useRef<HTMLButtonElement | null>(null);
  const driverAgeLauncherRef = useRef<HTMLButtonElement | null>(null);
  const pickupMobileInputRef = useRef<HTMLInputElement | null>(null);
  const dropoffMobileInputRef = useRef<HTMLInputElement | null>(null);
  const dateWrapRef = useRef<HTMLDivElement | null>(null);
  const timeWrapRef = useRef<HTMLDivElement | null>(null);
  const [datesOpen, setDatesOpen] = useState(false);
  const [timesOpen, setTimesOpen] = useState(false);
  const [activeMobilePicker, setActiveMobilePicker] =
    useState<CarsMobilePicker>(null);
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

      if (
        target instanceof Element &&
        target.closest("[data-flight-mobile-picker-shell]")
      ) {
        return;
      }

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
        setActiveMobilePicker(null);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [datesOpen, timesOpen]);

  const isMobilePickerViewport = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 639px)").matches;

  const openMobilePicker = (picker: Exclude<CarsMobilePicker, null>) => {
    setDatesOpen(false);
    setTimesOpen(false);
    setActiveMobilePicker(picker);
  };

  useEffect(() => {
    if (
      (activeMobilePicker !== "pickupLocation" &&
        activeMobilePicker !== "dropoffLocation") ||
      typeof window === "undefined"
    ) {
      return;
    }

    const focusId = window.setTimeout(() => {
      const inputRef =
        activeMobilePicker === "pickupLocation"
          ? pickupMobileInputRef
          : dropoffMobileInputRef;

      inputRef.current?.focus();
      inputRef.current?.select();
    }, 80);

    return () => window.clearTimeout(focusId);
  }, [activeMobilePicker]);

  const toggleDates = () => {
    if (isMobilePickerViewport()) {
      openMobilePicker("dates");
      return;
    }

    setDatesOpen((current) => {
      const nextOpen = !current;

      if (nextOpen) {
        setTimesOpen(false);
      }

      return nextOpen;
    });
  };

  const toggleTimes = () => {
    if (isMobilePickerViewport()) {
      openMobilePicker("times");
      return;
    }

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
    <section className="rounded-[1.5rem] border border-white/80 bg-white/95 p-3 pb-[calc(0.9rem+env(safe-area-inset-bottom))] shadow-[0_18px_44px_-18px_rgba(15,23,42,0.38)] ring-1 ring-slate-950/[0.06] sm:rounded-[1.75rem] sm:border-white/85 sm:bg-white/95 sm:p-3 sm:shadow-[0_24px_70px_-24px_rgba(15,23,42,0.42)] sm:ring-1 sm:ring-slate-950/[0.08] sm:backdrop-blur-xl lg:p-4">
      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        <input type="hidden" name="pickupDate" value={values.pickupDate} />
        <input type="hidden" name="dropoffDate" value={values.dropoffDate} />
        <input type="hidden" name="pickupTime" value={values.pickupTime} />
        <input type="hidden" name="dropoffTime" value={values.dropoffTime} />

        <div className="overflow-visible rounded-none border-0 bg-transparent p-0 shadow-none sm:rounded-[1.35rem] sm:border sm:border-slate-200/90 sm:bg-white sm:p-1 sm:shadow-[0_14px_34px_rgba(15,23,42,0.12)] sm:ring-1 sm:ring-slate-950/[0.03]">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-0 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1.45fr)_minmax(0,1.1fr)_minmax(6.8rem,0.62fr)_118px] lg:gap-0">
            <SearchCell
              label={t("carsSearch.pickupLocationLabel")}
              error={errors.pickupLocation || errors.dropoffLocation}
              className="sm:border-e sm:border-b sm:border-slate-200/80 lg:border-b-0"
            >
              <div className="grid gap-2">
                <div className="relative">
                  <button
                    ref={pickupLocationLauncherRef}
                    type="button"
                    onClick={() => openMobilePicker("pickupLocation")}
                    className={`flex h-7 w-full items-center border-none bg-transparent py-0 ps-0 pe-9 text-start text-[16px] font-semibold focus:outline-none sm:hidden ${
                      values.pickupLocation ? "text-slate-950" : "text-slate-400"
                    }`}
                  >
                    <span className="truncate">
                      {values.pickupLocation ||
                        t("carsSearch.pickupLocationPlaceholder")}
                    </span>
                  </button>
                  <input
                    ref={pickupLocationRef}
                    id="pickupLocation"
                    name="pickupLocation"
                    type="text"
                    value={values.pickupLocation}
                    onChange={(event) =>
                      updateValue("pickupLocation", event.target.value)
                    }
                    placeholder={t("carsSearch.pickupLocationPlaceholder")}
                    className="hidden h-7 w-full border-none bg-transparent py-0 ps-0 pe-9 text-[16px] font-semibold text-slate-950 placeholder:text-slate-400 focus:outline-none sm:block md:text-[15px] lg:h-8"
                    autoComplete="off"
                  />

                  {values.pickupLocation ? (
                    <button
                      type="button"
                      aria-label={t("carsSearch.clearPickupLocation")}
                      onClick={() => {
                        updateValue("pickupLocation", "");
                        pickupLocationRef.current?.focus();
                      }}
                      className="absolute end-0 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 focus-visible:ring-offset-1 lg:h-8 lg:w-8"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>

                {values.returnToDifferentLocation ? (
                  <div className="relative">
                    <button
                      ref={dropoffLocationLauncherRef}
                      type="button"
                      onClick={() => openMobilePicker("dropoffLocation")}
                      className={`flex h-7 w-full items-center border-t border-slate-100 bg-transparent py-0 ps-0 pe-9 pt-1.5 text-start text-[16px] font-semibold focus:outline-none sm:hidden ${
                        values.dropoffLocation
                          ? "text-slate-950"
                          : "text-slate-400"
                      }`}
                    >
                      <span className="truncate">
                        {values.dropoffLocation ||
                          t("carsSearch.returnLocationPlaceholder")}
                      </span>
                    </button>
                    <input
                      ref={dropoffLocationRef}
                      id="dropoffLocation"
                      name="dropoffLocation"
                      type="text"
                      value={values.dropoffLocation}
                      onChange={(event) =>
                        updateValue("dropoffLocation", event.target.value)
                      }
                      placeholder={t("carsSearch.returnLocationPlaceholder")}
                      className="hidden h-7 w-full border-t border-slate-100 bg-transparent py-0 ps-0 pe-9 pt-1.5 text-[16px] font-semibold text-slate-950 placeholder:text-slate-400 focus:outline-none sm:block md:text-[15px] lg:h-8 lg:pt-1.5"
                      autoComplete="off"
                    />

                    {values.dropoffLocation ? (
                      <button
                        type="button"
                        aria-label={t("carsSearch.clearReturnLocation")}
                        onClick={() => {
                          updateValue("dropoffLocation", "");
                          dropoffLocationRef.current?.focus();
                        }}
                        className="absolute end-0 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 focus-visible:ring-offset-1 lg:h-8 lg:w-8"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <p className="truncate border-t border-slate-100 pt-1.5 text-sm font-semibold text-slate-500 lg:pt-2">
                    {t("carsSearch.returnToSameLocation")}
                  </p>
                )}
              </div>
            </SearchCell>

            <SearchCell
              label={t("carsSearch.rentalDatesLabel")}
              error={dateError}
              className="relative sm:border-b sm:border-slate-200/80 lg:border-b-0 lg:border-e"
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
                launcherRef={datesLauncherRef}
                wrapRef={dateWrapRef}
              />
            </SearchCell>

            <SearchCell
              label={t("carsSearch.pickupReturnTimeLabel")}
              error={timeError}
              className="relative sm:border-e sm:border-slate-200/80"
            >
              <TimeRangeField
                isOpen={timesOpen}
                onToggle={toggleTimes}
                pickupTime={values.pickupTime}
                returnTime={values.dropoffTime}
                updateValue={updateValue}
                launcherRef={timesLauncherRef}
                wrapRef={timeWrapRef}
              />
            </SearchCell>

            <SearchCell
              label={t("carsSearch.driverAgeLabel")}
              error={errors.driverAge}
            >
              <button
                ref={driverAgeLauncherRef}
                type="button"
                onClick={() => openMobilePicker("driverAge")}
                className="flex h-7 w-full items-center justify-between gap-2 border-none bg-transparent p-0 text-start text-[16px] font-semibold text-slate-950 focus:outline-none sm:hidden"
              >
                <span className="truncate">
                  {values.driverAge === defaultDriverAge
                    ? t("carsSearch.driverAgeAnyAgeRange")
                    : getDriverAgeOptionLabel(values.driverAge)}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
              </button>
              <select
                id="driverAge"
                name="driverAge"
                value={values.driverAge}
                onChange={(event) =>
                  updateValue("driverAge", event.target.value)
                }
                className="hidden h-7 w-full border-none bg-transparent p-0 text-[16px] font-semibold text-slate-950 focus:outline-none sm:block md:text-[15px] lg:h-8"
              >
                {driverAgeOptions.map((age) => (
                  <option key={age} value={age}>
                    {age === defaultDriverAge
                      ? t("carsSearch.driverAgeAnyAgeRange")
                      : getDriverAgeOptionLabel(age)}
                  </option>
                ))}
              </select>
            </SearchCell>

            <div className="sm:col-span-2 lg:col-span-1">
              <button
                type="submit"
                className="focus-ring inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#004BB8] px-4 text-sm font-bold text-white shadow-[0_10px_22px_rgba(0,75,184,0.22)] transition hover:bg-[#021C2B] active:bg-[#004BB8] disabled:cursor-not-allowed disabled:opacity-75 disabled:hover:bg-[#004BB8] sm:h-full sm:min-h-[58px] sm:rounded-xl sm:shadow-[0_12px_26px_rgba(0,75,184,0.24)] lg:min-h-[64px] lg:rounded-none lg:rounded-e-[1.05rem] lg:border lg:border-s-0 lg:border-[#004BB8]/20 lg:text-[15px]"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? t("searchingCars") : t("search")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2 sm:rounded-2xl sm:border-slate-200/70 sm:bg-white/82 sm:px-3.5 sm:py-2 sm:shadow-[0_8px_20px_rgba(15,23,42,0.06)] sm:ring-1 sm:ring-white/70">
          <label className="focus-within:ring-ring inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-slate-900">
            <input
              type="checkbox"
              checked={values.returnToDifferentLocation}
              onChange={(event) =>
                updateValue("returnToDifferentLocation", event.target.checked)
              }
              className="h-4 w-4 rounded border-slate-300 text-[#004BB8] focus:ring-[#004BB8]/35"
            />
            {t("carsSearch.differentReturnLocation")}
          </label>

          {hasActiveSearch ? (
            <button
              type="button"
              onClick={onClearSearch}
              className="focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              {t("clearAll")}
            </button>
          ) : null}
        </div>

        <CarsMobilePickerDialogs
          activeMobilePicker={activeMobilePicker}
          clearRentalDates={clearRentalDates}
          dropoffMobileInputRef={dropoffMobileInputRef}
          driverAgeLauncherRef={driverAgeLauncherRef}
          pickupMobileInputRef={pickupMobileInputRef}
          pickupLocationLauncherRef={pickupLocationLauncherRef}
          dropoffLocationLauncherRef={dropoffLocationLauncherRef}
          datesLauncherRef={datesLauncherRef}
          timesLauncherRef={timesLauncherRef}
          onClose={() => setActiveMobilePicker(null)}
          onNextMonth={() =>
            setVisibleMonthDate((current) => addMonths(current, 1))
          }
          onPreviousMonth={() =>
            setVisibleMonthDate((current) => addMonths(current, -1))
          }
          onSelectDate={selectRentalDate}
          updateValue={updateValue}
          values={values}
          visibleMonthDate={visibleMonthDate}
        />

      </form>
    </section>
  );
}


function CarsMobilePickerDialogs({
  activeMobilePicker,
  clearRentalDates,
  datesLauncherRef,
  driverAgeLauncherRef,
  dropoffLocationLauncherRef,
  dropoffMobileInputRef,
  pickupLocationLauncherRef,
  pickupMobileInputRef,
  timesLauncherRef,
  onClose,
  onNextMonth,
  onPreviousMonth,
  onSelectDate,
  updateValue,
  values,
  visibleMonthDate,
}: {
  activeMobilePicker: CarsMobilePicker;
  clearRentalDates: () => void;
  datesLauncherRef: RefObject<HTMLButtonElement | null>;
  driverAgeLauncherRef: RefObject<HTMLButtonElement | null>;
  dropoffLocationLauncherRef: RefObject<HTMLButtonElement | null>;
  dropoffMobileInputRef: RefObject<HTMLInputElement | null>;
  pickupLocationLauncherRef: RefObject<HTMLButtonElement | null>;
  pickupMobileInputRef: RefObject<HTMLInputElement | null>;
  timesLauncherRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
  onSelectDate: (date: Date) => void;
  updateValue: <Key extends keyof CarsFormValues>(
    key: Key,
    value: CarsFormValues[Key],
  ) => void;
  values: CarsFormValues;
  visibleMonthDate: Date;
}) {
  const { locale, t } = useCarsLandingTranslations();
  const intlLocale = getCarsIntlLocale(locale);
  const weekdays = useMemo(() => formatCarWeekdays(intlLocale), [intlLocale]);
  const pickupParsed = parseIsoDate(values.pickupDate);
  const dropoffParsed = parseIsoDate(values.dropoffDate);
  const timeListClass =
    "grid max-h-72 gap-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2";

  return (
    <>
      <FlightMobilePickerShell
        open={activeMobilePicker === "pickupLocation"}
        title={t("carsSearch.pickupLocationLabel")}
        titleId="cars-mobile-pickup-location-title"
        launcherRef={pickupLocationLauncherRef}
        onClose={onClose}
        footer={(requestClose) => (
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => updateValue("pickupLocation", "")}
              className="focus-ring rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700"
            >
              {t("clear")}
            </button>
            <button
              type="button"
              onClick={requestClose}
              className="focus-ring rounded-full bg-[#004BB8] px-5 py-2 text-sm font-bold text-white"
            >
              {t("done")}
            </button>
          </div>
        )}
      >
        <input
          ref={pickupMobileInputRef}
          id="pickupLocationMobile"
          type="text"
          value={values.pickupLocation}
          onChange={(event) =>
            updateValue("pickupLocation", event.target.value)
          }
          placeholder={t("carsSearch.pickupLocationPlaceholder")}
          className="focus-ring h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[16px] font-semibold text-slate-950 placeholder:text-slate-400"
          autoComplete="off"
        />
      </FlightMobilePickerShell>

      <FlightMobilePickerShell
        open={activeMobilePicker === "dropoffLocation"}
        title={t("carsSearch.returnLocationPlaceholder")}
        titleId="cars-mobile-dropoff-location-title"
        launcherRef={dropoffLocationLauncherRef}
        onClose={onClose}
        footer={(requestClose) => (
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => updateValue("dropoffLocation", "")}
              className="focus-ring rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700"
            >
              {t("clear")}
            </button>
            <button
              type="button"
              onClick={requestClose}
              className="focus-ring rounded-full bg-[#004BB8] px-5 py-2 text-sm font-bold text-white"
            >
              {t("done")}
            </button>
          </div>
        )}
      >
        <input
          ref={dropoffMobileInputRef}
          id="dropoffLocationMobile"
          type="text"
          value={values.dropoffLocation}
          onChange={(event) =>
            updateValue("dropoffLocation", event.target.value)
          }
          placeholder={t("carsSearch.returnLocationPlaceholder")}
          className="focus-ring h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[16px] font-semibold text-slate-950 placeholder:text-slate-400"
          autoComplete="off"
        />
      </FlightMobilePickerShell>

      <FlightMobilePickerShell
        open={activeMobilePicker === "dates"}
        title={t("carsSearch.chooseRentalDates")}
        titleId="cars-mobile-rental-dates-title"
        launcherRef={datesLauncherRef}
        onClose={onClose}
        footer={(requestClose) => (
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={clearRentalDates}
              className="focus-ring rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700"
            >
              {t("clear")}
            </button>
            <button
              type="button"
              onClick={requestClose}
              className="focus-ring rounded-full bg-[#004BB8] px-5 py-2 text-sm font-bold text-white"
            >
              {t("done")}
            </button>
          </div>
        )}
      >
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <button type="button" onClick={onPreviousMonth} className="focus-ring rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">{t("carsSearch.previousMonthShort")}</button>
            <button type="button" onClick={onNextMonth} className="focus-ring rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">{t("carsSearch.nextMonthShort")}</button>
          </div>
          <div className="grid gap-5">
            {[0, 1].map((monthOffset) => {
              const monthDate = addMonths(visibleMonthDate, monthOffset);
              const cells = buildMonthCells(monthDate);

              return (
                <div key={monthOffset}>
                  <p className="mb-2 text-center text-sm font-bold text-slate-900">
                    {monthDate.toLocaleDateString(intlLocale, { month: "long", year: "numeric" })}
                  </p>
                  <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500">
                    {weekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {cells.map((cell) => {
                      const day = cell.date;
                      const iso = toIsoDate(day);
                      const isPickup = iso === values.pickupDate;
                      const isDropoff = iso === values.dropoffDate;
                      const isPastDate = isBeforeToday(day);
                      const isInRange = Boolean(pickupParsed && dropoffParsed && !isPastDate && day > pickupParsed && day < dropoffParsed);

                      if (!cell.isCurrentMonth) {
                        return <span key={`mobile-placeholder-${iso}`} aria-hidden="true" className="h-10" />;
                      }

                      return (
                        <button
                          key={iso}
                          type="button"
                          aria-label={`${t("carsSearch.selectDateAriaPrefix")} ${formatCarFullDate(day, intlLocale)}`}
                          onClick={() => onSelectDate(day)}
                          disabled={isPastDate}
                          className={`focus-ring flex h-10 items-center justify-center rounded-full text-sm font-semibold disabled:cursor-not-allowed ${
                            isPastDate ? "text-slate-300" : "text-slate-900 hover:bg-[#004BB8]/8"
                          } ${isInRange ? "rounded-xl bg-[#004BB8]/10 text-[#021C2B]" : ""} ${
                            isPickup || isDropoff ? "bg-[#004BB8] text-white hover:bg-[#004BB8]" : ""
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
        </div>
      </FlightMobilePickerShell>

      <FlightMobilePickerShell
        open={activeMobilePicker === "times"}
        title={t("carsSearch.pickupReturnTimeLabel")}
        titleId="cars-mobile-times-title"
        launcherRef={timesLauncherRef}
        onClose={onClose}
        footer={(requestClose) => (
          <button type="button" onClick={requestClose} className="focus-ring w-full rounded-full bg-[#004BB8] px-5 py-3 text-sm font-bold text-white">{t("done")}</button>
        )}
      >
        <div className="grid gap-5">
          {[
            ["pickupTime", t("carsSearch.pickupTimeLabel"), values.pickupTime],
            ["dropoffTime", t("carsSearch.returnTimeLabel"), values.dropoffTime],
          ].map(([field, label, selectedTime]) => (
            <section key={field} className="space-y-2">
              <h3 className="px-1 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</h3>
              <div className={timeListClass}>
                {timeOptions.map((time) => (
                  <button
                    key={`${field}-${time}`}
                    type="button"
                    onClick={() => updateValue(field as "pickupTime" | "dropoffTime", time)}
                    className={`focus-ring flex min-h-11 items-center justify-between rounded-xl px-3 text-sm font-bold ${
                      selectedTime === time ? "bg-[#004BB8] text-white" : "bg-slate-50 text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    {formatCarTimeLabel(time, intlLocale)}
                    {selectedTime === time ? <span aria-hidden="true">✓</span> : null}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </FlightMobilePickerShell>

      <FlightMobilePickerShell
        open={activeMobilePicker === "driverAge"}
        title={t("carsSearch.driverAgeLabel")}
        titleId="cars-mobile-driver-age-title"
        launcherRef={driverAgeLauncherRef}
        onClose={onClose}
        footer={(requestClose) => (
          <button type="button" onClick={requestClose} className="focus-ring w-full rounded-full bg-[#004BB8] px-5 py-3 text-sm font-bold text-white">{t("done")}</button>
        )}
      >
        <div className="grid gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
          {driverAgeOptions.map((age) => {
            const label = age === defaultDriverAge ? t("carsSearch.driverAgeAnyAgeRange") : getDriverAgeOptionLabel(age);
            const selected = values.driverAge === age;

            return (
              <button
                key={age}
                type="button"
                onClick={() => updateValue("driverAge", age)}
                className={`focus-ring flex min-h-12 items-center justify-between rounded-2xl px-4 text-start text-sm font-bold ${
                  selected ? "bg-[#004BB8] text-white" : "bg-slate-50 text-slate-800 hover:bg-slate-100"
                }`}
              >
                {label}
                {selected ? <span aria-hidden="true">✓</span> : null}
              </button>
            );
          })}
        </div>
      </FlightMobilePickerShell>
    </>
  );
}

function CarsPageShell() {
  const { t } = useCarsLandingTranslations();

  return (
    <>
      <AppHeader />
      <main className="page-shell bg-[linear-gradient(180deg,#f8fafc_0%,#f6f7fb_48%,#f8fafc_100%)] py-16">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 text-slate-600">
            <Clock
              className="h-5 w-5 animate-pulse text-[#004BB8]"
              aria-hidden="true"
            />
            {t("carsSearchPreparing")}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function CarImageCardLink({ card }: { card: TranslatedCarImageCard }) {
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
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_28px_-26px_rgba(15,23,42,0.34)] transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_14px_30px_-26px_rgba(15,23,42,0.38)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#004BB8]/35 focus-visible:ring-offset-4 focus-visible:ring-offset-white"
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
        <p className="text-lg font-bold leading-tight tracking-tight text-slate-950">
          {card.title}
        </p>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
          {card.subtitle}
        </p>
        {card.cta ? (
          <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#004BB8] transition-colors group-hover:text-[#021C2B]">
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

function CarPickupCardLink({ card }: { card: TranslatedCarImageCard }) {
  return (
    <CarImageCardLink
      card={{
        ...card,
        ariaLabel: card.ariaLabel,
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
  launcherRef,
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
  launcherRef?: RefObject<HTMLButtonElement | null>;
  visibleMonthDate: Date;
  wrapRef: RefObject<HTMLDivElement | null>;
}) {
  const { locale, t } = useCarsLandingTranslations();
  const intlLocale = getCarsIntlLocale(locale);
  const weekdays = useMemo(() => formatCarWeekdays(intlLocale), [intlLocale]);
  const pickupDisplay = formatCarDisplayDate(pickupDate, intlLocale);
  const dropoffDisplay = formatCarDisplayDate(dropoffDate, intlLocale);
  const pickupParsed = parseIsoDate(pickupDate);
  const dropoffParsed = parseIsoDate(dropoffDate);
  const dateSummary = pickupDisplay
    ? dropoffDisplay
      ? `${pickupDisplay} — ${dropoffDisplay}`
      : pickupDisplay
    : t("carsSearch.rentalDatePlaceholder");

  return (
    <div ref={wrapRef}>
      <button
        ref={launcherRef}
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={t("carsSearch.chooseRentalDatesAria")}
        className="focus-ring flex h-7 w-full items-center gap-2 rounded-md border-0 bg-transparent px-0 text-start text-[16px] font-semibold text-slate-950 outline-none transition-colors md:text-[15px] lg:h-8"
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
          aria-label={t("carsSearch.rentalDatePickerAria")}
          className="absolute start-0 end-0 top-[calc(100%+10px)] z-[200] hidden w-full rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_20px_45px_rgba(15,23,42,0.16)] sm:block sm:end-auto sm:w-[min(92vw,620px)] sm:p-4"
        >
          <p className="mb-3 text-base font-semibold text-slate-900">
            {t("carsSearch.chooseRentalDates")}
          </p>
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              aria-label={t("carsSearch.previousMonth")}
              onClick={onPreviousMonth}
              className="focus-ring rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              {t("carsSearch.previousMonthShort")}
            </button>
            <button
              type="button"
              aria-label={t("carsSearch.nextMonth")}
              onClick={onNextMonth}
              className="focus-ring rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              {t("carsSearch.nextMonthShort")}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            {[0, 1].map((monthOffset) => {
              const monthDate = addMonths(visibleMonthDate, monthOffset);
              const cells = buildMonthCells(monthDate);

              return (
                <div key={monthOffset}>
                  <p className="mb-1.5 text-center text-sm font-semibold text-slate-800">
                    {monthDate.toLocaleDateString(intlLocale, {
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
                          aria-label={`${t("carsSearch.selectDateAriaPrefix")} ${formatCarFullDate(day, intlLocale)}${
                            isBeforePickup
                              ? `; ${t("carsSearch.startsNewPickupDate")}`
                              : ""
                          }`}
                          onClick={() => onSelectDate(day)}
                          disabled={isPastDate}
                          className={`focus-ring flex h-8 w-8 items-center justify-center justify-self-center rounded-full text-sm transition-colors disabled:cursor-not-allowed ${
                            isPastDate
                              ? "text-slate-300 hover:bg-transparent"
                              : isBeforePickup
                                ? "text-slate-500 hover:bg-[#004BB8]/8"
                                : "text-slate-900 hover:bg-[#004BB8]/8"
                          } ${
                            isInRange
                              ? "rounded-md bg-[#004BB8]/10 text-[#021C2B] hover:bg-[#004BB8]/10"
                              : ""
                          } ${
                            isPickup || isDropoff
                              ? "bg-[#004BB8] text-white hover:bg-[#004BB8]"
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
              {t("clear")}
            </button>
            <button
              type="button"
              onClick={onDone}
              className="focus-ring rounded-lg bg-[#004BB8] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,75,184,0.20)] transition-colors hover:bg-[#021C2B] active:bg-[#021C2B] focus-visible:ring-[#004BB8]/35"
            >
              {t("done")}
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
  launcherRef,
  wrapRef,
}: {
  isOpen: boolean;
  onToggle: () => void;
  pickupTime: string;
  returnTime: string;
  launcherRef?: RefObject<HTMLButtonElement | null>;
  updateValue: <Key extends keyof CarsFormValues>(
    key: Key,
    value: CarsFormValues[Key],
  ) => void;
  wrapRef: RefObject<HTMLDivElement | null>;
}) {
  const { locale, t } = useCarsLandingTranslations();
  const intlLocale = getCarsIntlLocale(locale);
  const timeSummary = formatTimeRangeSummary(
    t("carsSearch.pickupReturnTimeSummary"),
    formatCarTimeLabel(pickupTime, intlLocale),
    formatCarTimeLabel(returnTime, intlLocale),
  );

  return (
    <div ref={wrapRef}>
      <button
        ref={launcherRef}
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={t("carsSearch.choosePickupReturnTimesAria")}
        className="focus-ring flex h-7 w-full items-center justify-between gap-2 rounded-md border-0 bg-transparent px-0 text-start text-[16px] font-semibold text-slate-950 outline-none transition-colors md:text-[15px] lg:h-8"
      >
        <span className="truncate">{timeSummary}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div
          role="menu"
          aria-label={t("carsSearch.pickupReturnTimeSelectorAria")}
          className="absolute start-0 end-0 top-[calc(100%+8px)] z-[180] hidden w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_14px_32px_rgba(15,23,42,0.14)] sm:block sm:end-auto sm:w-[min(92vw,320px)]"
        >
          <div className="grid gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("carsSearch.pickupTimeLabel")}
              </span>
              <select
                id="pickupTime"
                value={pickupTime}
                onChange={(event) =>
                  updateValue("pickupTime", event.target.value)
                }
                className="focus-ring h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[16px] font-semibold text-slate-950 outline-none transition focus:border-[#004BB8] md:text-sm"
              >
                {timeOptions.map((time) => (
                  <option key={`pickup-${time}`} value={time}>
                    {formatCarTimeLabel(time, intlLocale)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("carsSearch.returnTimeLabel")}
              </span>
              <select
                id="dropoffTime"
                value={returnTime}
                onChange={(event) =>
                  updateValue("dropoffTime", event.target.value)
                }
                className="focus-ring h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[16px] font-semibold text-slate-950 outline-none transition focus:border-[#004BB8] md:text-sm"
              >
                {timeOptions.map((time) => (
                  <option key={`return-${time}`} value={time}>
                    {formatCarTimeLabel(time, intlLocale)}
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
      className={`min-h-[54px] rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-400 focus-within:border-[#004BB8] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#004BB8]/25 sm:min-h-[58px] sm:rounded-none sm:border-0 sm:bg-transparent sm:px-3.5 sm:py-2 sm:shadow-none sm:hover:border-slate-200/80 sm:focus-within:bg-white sm:focus-within:ring-0 lg:min-h-[64px] lg:px-3.5 lg:py-2 ${className}`}
    >
      <label className="mb-1 block text-xs font-bold uppercase leading-4 tracking-[0.12em] text-slate-600 sm:mb-1 sm:text-[0.68rem] sm:text-slate-500 lg:mb-1">
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
