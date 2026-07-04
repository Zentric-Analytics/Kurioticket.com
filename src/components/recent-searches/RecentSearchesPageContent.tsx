"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight, Clock, ExternalLink, Trash2, X } from "lucide-react";

import { useLocale } from "@/components/layout/LocaleProvider";

import { translations as enTranslations } from "@/lib/i18n/en";
import {
  clearRecentSearches,
  clearBackendRecentSearches,
  deleteBackendRecentSearch,
  fetchBackendRecentSearches,
  readRecentSearches,
  removeRecentSearch,
  type RecentFlightParams,
  type RecentSearchEntry,
} from "@/lib/recent-searches";
import {
  getHomeDiscoveryByRegion,
  homeDiscoveryByRegion,
} from "@/data/homeDiscovery";

const allDiscoveryItems = [
  ...Object.values(homeDiscoveryByRegion).flat(),
  ...getHomeDiscoveryByRegion(),
];

const getSavedTripsDateLocale = (locale: string) => {
  const normalizedLocale = locale.toLowerCase();

  if (normalizedLocale.startsWith("de")) return "de-DE";
  if (normalizedLocale.startsWith("ar")) return "ar";
  if (normalizedLocale.startsWith("fr")) return "fr-FR";
  if (normalizedLocale.startsWith("es")) return "es-ES";
  if (normalizedLocale.startsWith("it")) return "it-IT";
  if (normalizedLocale.startsWith("hi")) return "hi-IN";
  if (normalizedLocale.startsWith("nl")) return "nl-NL";
  if (normalizedLocale.startsWith("tr")) return "tr-TR";
  if (normalizedLocale.startsWith("t" + "h")) return "th-TH";
  if (normalizedLocale === "pt-br" || normalizedLocale.startsWith("pt")) {
    return "pt-BR";
  }
  if (normalizedLocale === "zh-cn" || normalizedLocale.startsWith("zh")) {
    return "zh-CN";
  }
  if (normalizedLocale === "ja" || normalizedLocale.startsWith("ja")) {
    return "ja-JP";
  }
  if (normalizedLocale === "ko" || normalizedLocale.startsWith("ko")) {
    return "ko-KR";
  }

  return "en-US";
};

const parseDateValue = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value,
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDutchShortMonth = (formattedDate: string, locale: string) => {
  if (!locale.toLowerCase().startsWith("nl")) return formattedDate;

  return formattedDate.replace(/\b([a-z]{3})(?=\s|$)/i, (month) =>
    month.endsWith(".") ? month : `${month}.`,
  );
};

const formatRecentDate = (
  value: string | undefined,
  formatter: Intl.DateTimeFormat,
  fallback: string,
  locale: string,
) => {
  if (!value) return fallback;
  const parsed = parseDateValue(value);
  return parsed
    ? formatDutchShortMonth(formatter.format(parsed), locale)
    : value;
};

const isFlightParams = (
  params: RecentSearchEntry["params"],
): params is RecentFlightParams => "origin" in params && "cabinClass" in params;

const sortRecentSearchesByDate = (entries: RecentSearchEntry[]) =>
  [...entries].sort((left, right) => {
    const leftDate = Date.parse(left.createdAt);
    const rightDate = Date.parse(right.createdAt);
    return (
      (Number.isFinite(rightDate) ? rightDate : 0) -
      (Number.isFinite(leftDate) ? leftDate : 0)
    );
  });

const cabinTranslationKeyByValue: Record<string, string> = {
  economy: "savedTripsCabinEconomy",
  "premium economy": "savedTripsCabinPremiumEconomy",
  business: "savedTripsCabinBusiness",
  first: "savedTripsCabinFirst",
};

const normalizeDestinationKey = (value: string) =>
  value.normalize("NFKD").replace(/\p{M}/gu, "").trim().toLowerCase();

const SAVED_TRIP_CARD_IMAGE_SIZES =
  "(min-width: 1280px) 25vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 100vw";
const OPTIMIZED_REMOTE_IMAGE_HOSTS = new Set([
  "images.unsplash.com",
  "images.pexels.com",
]);

function getCardImageOptimizationMode(src: string) {
  if (src.startsWith("/")) return { supported: true, optimized: true };

  try {
    const url = new URL(src);
    const supported = url.protocol === "http:" || url.protocol === "https:";
    return {
      supported,
      optimized:
        url.protocol === "https:" &&
        OPTIMIZED_REMOTE_IMAGE_HOSTS.has(url.hostname),
    };
  } catch {
    return { supported: false, optimized: false };
  }
}

type SavedCardImageProps = {
  src: string;
  alt: string;
  priority?: boolean;
  hoverScaleClassName?: string;
};

function SavedCardImage({
  src,
  alt,
  priority = false,
  hoverScaleClassName = "group-hover:scale-[1.03]",
}: SavedCardImageProps) {
  const imageMode = getCardImageOptimizationMode(src);
  const imageClassName = `object-cover transition duration-500 ${hoverScaleClassName}`;

  return (
    <div className="relative h-[196px] w-full shrink-0 overflow-hidden md:h-[190px] lg:h-[198px]">
      {imageMode.supported ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={SAVED_TRIP_CARD_IMAGE_SIZES}
          className={imageClassName}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          unoptimized={!imageMode.optimized}
        />
      ) : null}
    </div>
  );
}

const genericTravelFallback =
  allDiscoveryItems.find(
    (item) => normalizeDestinationKey(item.destinationCity) === "dubai",
  ) ??
  allDiscoveryItems.find(
    (item) => normalizeDestinationKey(item.destinationCity) === "london",
  ) ??
  allDiscoveryItems.find((item) => Boolean(item.image));

const findFlightDiscoveryImage = (entry: RecentSearchEntry) => {
  const params = entry.params as { origin?: string; destination?: string };
  const origin = params.origin?.trim().toUpperCase() ?? "";
  const destination = params.destination?.trim().toUpperCase() ?? "";
  const labelKey = normalizeDestinationKey(entry.label);

  const byDestinationCode = allDiscoveryItems.find(
    (item) => item.destinationCode === destination,
  );
  if (byDestinationCode) return byDestinationCode;

  const byRoute = allDiscoveryItems.find(
    (item) =>
      item.originCode === origin && item.destinationCode === destination,
  );
  if (byRoute) return byRoute;

  return allDiscoveryItems.find((item) => {
    const destinationCity = normalizeDestinationKey(item.destinationCity);
    const title = normalizeDestinationKey(item.title);
    return labelKey.includes(destinationCity) || title.includes(labelKey);
  });
};

const resolveRecentSearchImage = (entry: RecentSearchEntry) => {
  if (entry.image) {
    return {
      image: entry.image,
      imageAlt: entry.imageAlt ?? entry.label,
    };
  }

  const match = findFlightDiscoveryImage(entry);
  if (match) {
    return { image: match.image, imageAlt: match.imageAlt };
  }

  if (genericTravelFallback?.image) {
    return {
      image: genericTravelFallback.image,
      imageAlt: genericTravelFallback.imageAlt ?? "Travel destination",
    };
  }

  return null;
};

type RecentSearchesPageContentProps = {
  compactTopSpacing?: boolean;
  compactTopSpacingMobile?: boolean;
};

export function RecentSearchesPageContent({
  compactTopSpacing = false,
  compactTopSpacingMobile = compactTopSpacing,
}: RecentSearchesPageContentProps) {
  const { t: dictionary } = useLocale();
  const { locale } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const dateLocale = getSavedTripsDateLocale(locale);
  const shortDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(dateLocale, {
        month: "short",
        day: "numeric",
      }),
    [dateLocale],
  );
  const searchedDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(dateLocale, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    [dateLocale],
  );
  const { status: sessionStatus } = useSession();
  const [recentSearches, setRecentSearches] = useState<RecentSearchEntry[]>([]);

  const refreshBackendRecentSearches = useCallback(
    async (signal?: AbortSignal) => {
      const result = await fetchBackendRecentSearches(signal);
      if (signal?.aborted || !result.ok || !result.items) return;

      setRecentSearches(
        sortRecentSearchesByDate(
          result.items.filter((entry) => entry.type === "flight"),
        ).slice(0, 5),
      );
    },
    [],
  );

  useEffect(() => {
    if (sessionStatus === "loading") return;

    if (sessionStatus === "authenticated") {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => {
        void refreshBackendRecentSearches(controller.signal);
      }, 0);

      return () => {
        window.clearTimeout(timeoutId);
        controller.abort();
      };
    }

    const timeoutId = window.setTimeout(() => {
      setRecentSearches(
        readRecentSearches().filter((entry) => entry.type === "flight"),
      );
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refreshBackendRecentSearches, sessionStatus]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;

    const handlePageActive = () => {
      if (document.visibilityState === "hidden") return;
      void refreshBackendRecentSearches();
    };

    window.addEventListener("focus", handlePageActive);
    document.addEventListener("visibilitychange", handlePageActive);

    return () => {
      window.removeEventListener("focus", handlePageActive);
      document.removeEventListener("visibilitychange", handlePageActive);
    };
  }, [refreshBackendRecentSearches, sessionStatus]);

  const handleRemoveRecent = (id: string) => {
    if (sessionStatus === "authenticated") {
      setRecentSearches((current) =>
        current.filter((entry) => entry.id !== id && entry.type === "flight"),
      );
      void deleteBackendRecentSearch(id);
      return;
    }

    setRecentSearches(
      removeRecentSearch(id).filter((entry) => entry.type === "flight"),
    );
  };

  const handleClearRecent = () => {
    setRecentSearches([]);
    if (sessionStatus === "authenticated") {
      void clearBackendRecentSearches();
      return;
    }

    clearRecentSearches();
  };

  const formatTravelerCount = (count: number) =>
    count === 1
      ? t("savedTripsTravelerCountOne")
      : t("savedTripsTravelerCountOther").replace("{{count}}", String(count));

  const formatCabinClass = (value: string) => {
    const key = cabinTranslationKeyByValue[value.trim().toLowerCase()];
    return key ? t(key) : value;
  };

  const formatRecentSearchSubtitle = (entry: RecentSearchEntry) => {
    if (isFlightParams(entry.params)) {
      const outbound = formatRecentDate(
        entry.params.departureDate,
        shortDateFormatter,
        entry.params.departureDate,
        locale,
      );
      const inbound = entry.params.returnDate
        ? formatRecentDate(
            entry.params.returnDate,
            shortDateFormatter,
            entry.params.returnDate,
            locale,
          )
        : t("savedTripsRecentOneWay");

      return `${outbound}${entry.params.returnDate ? ` – ${inbound}` : ""} · ${formatTravelerCount(entry.params.travelers)} · ${formatCabinClass(entry.params.cabinClass)}`;
    }

    return entry.subtitle;
  };

  const formatSearchedLabel = (value?: string) =>
    t("savedTripsSearchedDate").replace(
      "{{date}}",
      formatRecentDate(value, searchedDateFormatter, "", locale),
    );

  return (
    <div
      className={`px-4 pb-8 sm:px-6 sm:pb-10 lg:px-8 lg:pb-11 ${
        compactTopSpacing
          ? compactTopSpacingMobile
            ? "pt-2 sm:pt-3 lg:pt-4"
            : "pt-6 sm:pt-3 lg:pt-4"
          : "pt-6 sm:pt-8 lg:pt-10"
      }`}
    >
      <div className="mx-auto min-w-0 max-w-[88rem] text-start">
        <div className="space-y-4">
          <div>
            <h1
              id="recent-searches-title"
              className="inline-flex items-center gap-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]"
            >
              {t("recentSearchesPageTitle")}
              <Clock className="h-6 w-6 text-slate-500" aria-hidden="true" />
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              {t("recentSearchesPageSubtitle")}
            </p>
          </div>

          {recentSearches.length > 0 ? (
            <section
              className="space-y-4 pt-4"
              aria-labelledby="recent-searches-title"
            >
              <div className="flex justify-start border-b border-slate-200/80 pb-3 sm:justify-end">
                <button
                  type="button"
                  onClick={handleClearRecent}
                  className="inline-flex items-center gap-1.5 rounded-md px-0 py-1 text-sm font-semibold text-violet-700 transition hover:text-violet-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 sm:px-2"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("savedTripsClearAllRecent")}
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {recentSearches.map((entry) => {
                  const visual = resolveRecentSearchImage(entry);

                  return (
                    <article
                      key={entry.id}
                      className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-transparent shadow-[0_16px_30px_-22px_rgba(15,23,42,0.52)] transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_24px_36px_-20px_rgba(15,23,42,0.6)] active:-translate-y-0.5"
                    >
                      <button
                        type="button"
                        aria-label={t("savedTripsRemoveRecentSearch")}
                        onClick={() => handleRemoveRecent(entry.id)}
                        className="focus-ring absolute end-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                      >
                        <X className="h-4 w-4" />
                      </button>

                      {visual?.image ? (
                        <SavedCardImage
                          src={visual.image}
                          alt={visual.imageAlt}
                          hoverScaleClassName="group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="flex h-[196px] w-full shrink-0 items-center justify-center bg-gradient-to-br from-slate-100 via-indigo-50 to-cyan-100 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 md:h-[190px] lg:h-[198px]">
                          {t("savedTripsFlightSearchFallback")}
                        </div>
                      )}

                      <div className="flex min-w-0 flex-1 flex-col bg-white">
                        <div className="min-w-0 flex-1 space-y-2 px-3 pt-3">
                          <span className="inline-flex w-fit rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                            {dictionary.savedTripsTypeFlight ??
                              enTranslations.savedTripsTypeFlight}
                          </span>

                          <h3 className="line-clamp-2 break-words pe-10 text-sm font-bold leading-[1.35] text-slate-950 md:text-[0.95rem]">
                            {entry.label}
                          </h3>
                          <p className="line-clamp-2 break-words text-xs font-medium leading-5 text-slate-600 md:text-sm">
                            {formatRecentSearchSubtitle(entry)}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                              {formatSearchedLabel(entry.createdAt)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-auto border-t border-slate-200/90 px-3 pb-3 pt-3">
                          <div className="flex flex-col items-stretch gap-2">
                            <Link
                              href={entry.href}
                              className="inline-flex min-h-9 items-center justify-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-center text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-900"
                            >
                              {dictionary.savedTripsRepeatSearch ??
                                enTranslations.savedTripsRepeatSearch}
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : (
            <section
              className="flex min-h-[22rem] items-start justify-center px-3 pb-10 pt-6 sm:min-h-[32rem] sm:pt-10 lg:min-h-[34rem] lg:pt-12"
              aria-labelledby="recent-searches-empty-title"
            >
              <div className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                  <Clock className="h-8 w-8" aria-hidden="true" />
                </div>
                <h2
                  id="recent-searches-empty-title"
                  className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[1.6rem]"
                >
                  {t("recentSearchesEmptyTitle")}
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600 sm:mt-4">
                  {t("recentSearchesEmptyDescription")}
                </p>
                <Link
                  href="/flights"
                  className="mt-6 inline-flex min-h-11 w-auto min-w-[8rem] items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-8 py-2 text-sm font-semibold text-white shadow-[0_18px_36px_-24px_rgba(37,99,235,0.9)] transition hover:bg-blue-700 sm:mt-4"
                >
                  {t("recentSearchesSearchFlights")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
