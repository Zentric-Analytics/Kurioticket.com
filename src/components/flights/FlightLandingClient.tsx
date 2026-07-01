"use client";

import Image from "next/image";
import Link from "next/link";
import { Plane } from "lucide-react";

import { FaqAccordion } from "@/components/faq/FaqAccordion";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { StandaloneFlightSearchForm } from "@/components/search/StandaloneFlightSearchForm";
import {
  getHomeDiscoveryByRegion,
  homeDiscoveryByRegion,
  type HomeDiscoveryItem,
} from "@/data/homeDiscovery";
import { buildDiscoveryLink } from "@/lib/home/buildDiscoveryLinks";
import { translations as enTranslations } from "@/lib/i18n/en";
import { formatHomeDiscoveryRoute } from "@/lib/i18n/homeDiscovery";

const allDiscoveryItems = [
  ...Object.values(homeDiscoveryByRegion).flat(),
  ...getHomeDiscoveryByRegion(),
];

const beachDestinationKeywords = [
  "algarve",
  "bali",
  "cancun",
  "cape town",
  "faro",
  "honolulu",
  "miami",
  "puerto vallarta",
  "san diego",
  "san juan",
  "sydney",
  "zanzibar",
];

function SearchReadyIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="h-12 w-12"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" rx="18" fill="url(#flightSearchTile)" />
      <rect x="12" y="15" width="35" height="31" rx="8" fill="white" />
      <rect x="17" y="21" width="17" height="3" rx="1.5" fill="#004BB8" />
      <rect x="17" y="29" width="23" height="2.5" rx="1.25" fill="#D8E7F8" />
      <path
        d="M19 37H37"
        stroke="#CBD5E1"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M22 37L27.5 32L32.5 37L27.5 42L22 37Z" fill="#D8E7F8" />
      <circle cx="43" cy="40" r="10" fill="#F2F7FA" fillOpacity="0.92" />
      <circle cx="43" cy="40" r="7" stroke="#021C2B" strokeWidth="2.8" />
      <path
        d="M48 45L54 51"
        stroke="#021C2B"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M39.5 40.5L42 43L47 37.5"
        stroke="#14B8A6"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient
          id="flightSearchTile"
          x1="6"
          y1="5"
          x2="58"
          y2="59"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F2F7FA" />
          <stop offset="1" stopColor="#ECFEFF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function CompareFlightsIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="h-12 w-12"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" rx="18" fill="url(#flightCompareTile)" />
      <rect x="11" y="17" width="30" height="15" rx="5" fill="white" />
      <rect x="17" y="23" width="10" height="3" rx="1.5" fill="#5CB6B2" />
      <path
        d="M29 24.5H35"
        stroke="#CFEAE8"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <rect x="23" y="32" width="30" height="15" rx="5" fill="#F8FAFC" />
      <rect x="29" y="38" width="10" height="3" rx="1.5" fill="#0D9488" />
      <path
        d="M41 39.5H47"
        stroke="#99F6E4"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M18 43C22.5 35.5 33.5 28.5 46 24"
        stroke="#021C2B"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeDasharray="1 5"
      />
      <path
        d="M41 22.5L47 24L43 28.5"
        stroke="#021C2B"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="18"
        cy="43"
        r="4"
        fill="#D8E7F8"
        stroke="#004BB8"
        strokeWidth="2"
      />
      <circle
        cx="46"
        cy="24"
        r="4"
        fill="#CCFBF1"
        stroke="#0D9488"
        strokeWidth="2"
      />
      <defs>
        <linearGradient
          id="flightCompareTile"
          x1="5"
          y1="5"
          x2="59"
          y2="59"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F2F7FA" />
          <stop offset="1" stopColor="#EAF7F6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function ProviderHandoffIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="h-12 w-12"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" rx="18" fill="url(#flightProviderTile)" />
      <rect x="18" y="14" width="31" height="25" rx="7" fill="white" />
      <rect x="23" y="20" width="14" height="3" rx="1.5" fill="#004BB8" />
      <rect x="23" y="28" width="20" height="2.5" rx="1.25" fill="#D8E7F8" />
      <path
        d="M15 34L27 30L39 34V41C39 48 34.5 52.5 27 55C19.5 52.5 15 48 15 41V34Z"
        fill="#F2F7FA"
        stroke="#021C2B"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <rect x="23" y="40" width="8" height="7" rx="1.8" fill="#14B8A6" />
      <path
        d="M25 40V38C25 36.9 25.9 36 27 36C28.1 36 29 36.9 29 38V40"
        stroke="#0F766E"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M41 47H52M52 47L48 43M52 47L48 51"
        stroke="#004BB8"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient
          id="flightProviderTile"
          x1="6"
          y1="5"
          x2="58"
          y2="59"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F2F7FA" />
          <stop offset="1" stopColor="#F0FDFA" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function getFlightFaqItems(
  t: (key: string) => string,
): Array<{ question: string; answer: string }> {
  return [
    {
      question: t("flightFaqBestTimeQuestion"),
      answer: t("flightFaqBestTimeAnswer"),
    },
    {
      question: t("flightFaqBeforeBookingQuestion"),
      answer: t("flightFaqBeforeBookingAnswer"),
    },
    {
      question: t("flightFaqFlexibleFareQuestion"),
      answer: t("flightFaqFlexibleFareAnswer"),
    },
    {
      question: t("flightFaqNonstopQuestion"),
      answer: t("flightFaqNonstopAnswer"),
    },
    {
      question: t("flightFaqBaggageQuestion"),
      answer: t("flightFaqBaggageAnswer"),
    },
    {
      question: t("flightFaqChangeCancelQuestion"),
      answer: t("flightFaqChangeCancelAnswer"),
    },
    {
      question: t("flightFaqInternationalQuestion"),
      answer: t("flightFaqInternationalAnswer"),
    },
  ];
}

function getBeachVacationCards(
  regionCode: string,
  excludedIds: Set<string>,
): HomeDiscoveryItem[] {
  const regionalCards = getHomeDiscoveryByRegion(regionCode);
  const regionalMatches = regionalCards.filter(
    (item) =>
      !excludedIds.has(item.id) &&
      beachDestinationKeywords.some((keyword) =>
        `${item.title} ${item.destinationCity} ${item.routeNote}`
          .toLowerCase()
          .includes(keyword),
      ),
  );

  if (regionalMatches.length >= 6) {
    return regionalMatches.slice(0, 6);
  }

  const selectedIds = new Set(regionalMatches.map((item) => item.id));
  const fallbackMatches = allDiscoveryItems.filter(
    (item) =>
      !excludedIds.has(item.id) &&
      !selectedIds.has(item.id) &&
      beachDestinationKeywords.some((keyword) =>
        `${item.title} ${item.destinationCity} ${item.routeNote}`
          .toLowerCase()
          .includes(keyword),
      ),
  );

  return [...regionalMatches, ...fallbackMatches].slice(0, 6);
}

function getDiscoveryTranslation(
  keyPrefix: string,
  value: string,
  t: (key: string) => string,
) {
  return t(`${keyPrefix}.${value}`) || value;
}

function getRouteText(item: HomeDiscoveryItem, t: (key: string) => string) {
  return {
    title: t(`homeDiscoveryRoute.${item.id}.title`) || item.title,
    routeNote: t(`homeDiscoveryRoute.${item.id}.routeNote`) || item.routeNote,
    originCity: getDiscoveryTranslation(
      "flightLandingCity",
      item.originCity,
      t,
    ),
    destinationCity: getDiscoveryTranslation(
      "flightLandingCity",
      item.destinationCity,
      t,
    ),
    imageAlt: getDiscoveryTranslation(
      "flightLandingImageAlt",
      item.imageAlt,
      t,
    ),
  };
}

function RouteCard({
  item,
  priority = false,
  t,
}: {
  item: HomeDiscoveryItem;
  priority?: boolean;
  t: (key: string) => string;
}) {
  const routeText = getRouteText(item, t);
  const routeLabel = formatHomeDiscoveryRoute(
    { flightLandingRouteTemplate: t("flightLandingRouteTemplate") },
    routeText.originCity,
    routeText.destinationCity,
  );

  return (
    <Link
      href={buildDiscoveryLink(item)}
      aria-label={t("flightLandingRouteAriaLabel")
        .replace("{{origin}}", routeText.originCity)
        .replace("{{destination}}", routeText.destinationCity)}
      className="group block overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.07)] transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_18px_42px_rgba(79,70,229,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
    >
      <article className="flex h-full flex-col">
        <div className="relative h-40 overflow-hidden bg-slate-100">
          <Image
            src={item.image}
            alt={routeText.imageAlt}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-105 group-focus-visible:scale-105"
          />
        </div>
        <div className="flex flex-1 flex-col p-5">
          <h3 className="text-lg font-bold tracking-tight text-slate-950">
            {routeText.title}
          </h3>
          <p className="mt-1 text-sm font-medium text-slate-700">
            {routeLabel}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {item.originCode} → {item.destinationCode}
          </p>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
            {routeText.routeNote}
          </p>
          <span className="mt-5 inline-flex min-h-10 w-fit items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-700 to-violet-600 px-4 text-sm font-semibold text-white shadow-sm shadow-indigo-700/20 transition duration-200 group-hover:from-indigo-600 group-hover:to-violet-500 group-hover:shadow-[0_10px_22px_rgba(79,70,229,0.18)] group-active:translate-y-px">
            {t("flightLandingStartThisSearch")}
            <Plane className="h-4 w-4 shrink-0 stroke-[2.4] transition duration-200 group-hover:translate-x-0.5" />
          </span>
        </div>
      </article>
    </Link>
  );
}

export function FlightLandingClient() {
  const { t: dictionary } = useLocale();
  const { selectedOption } = useRegion();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";

  const discoveryCards = getHomeDiscoveryByRegion(selectedOption.code).slice(
    0,
    4,
  );
  const discoveryIds = new Set(discoveryCards.map((item) => item.id));
  const beachVacationCards = getBeachVacationCards(
    selectedOption.code,
    discoveryIds,
  );
  const routeInspirationCards = getHomeDiscoveryByRegion(selectedOption.code)
    .filter((item) => !discoveryIds.has(item.id))
    .slice(0, 8);

  const heroTitle = t("flightLandingHeroTitle");
  const heroSubtitle = t("flightLandingHeroSubtitle");
  const englishHeroTitle = enTranslations.flightLandingHeroTitle;
  const englishHeroSubtitle = enTranslations.flightLandingHeroSubtitle;
  const englishHeroTitleFirstLine = englishHeroTitle.replace(
    " flight with ease.",
    "",
  );
  const englishHeroTitleSecondLine = englishHeroTitle.replace(
    `${englishHeroTitleFirstLine} `,
    "",
  );
  const englishHeroSubtitleFirstLine = englishHeroSubtitle.replace(
    " options for your next journey.",
    "",
  );
  const englishHeroSubtitleSecondLine = englishHeroSubtitle.replace(
    `${englishHeroSubtitleFirstLine} `,
    "",
  );
  const useEnglishHeroWrap =
    heroTitle === englishHeroTitle && heroSubtitle === englishHeroSubtitle;

  const heroImageUrl =
    "/images/premium/flights/kurioticket-flight-hero-airplane-terminal-sunset-001.jpg";

  return (
    <main className="flex-1 bg-slate-50 pb-12">
      <section className="relative isolate z-20 min-h-[24.25rem] overflow-visible bg-slate-950 sm:hidden">
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src={heroImageUrl}
            alt={t("flightLandingHeroImageAlt")}
            fill
            priority
            sizes="100vw"
            className="object-cover object-[56%_42%] brightness-[1.08] saturate-[1.08] contrast-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/18 via-slate-950/8 to-amber-950/10" />
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-slate-950/34 via-slate-950/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/24 via-slate-950/6 to-transparent" />
        </div>

        <div className="page-shell relative z-10 flex min-h-[24.25rem] items-start pt-[7.85rem]">
          <div className="max-w-[22.5rem] pe-2 text-start text-white">
            <h1 className="text-[clamp(1.38rem,6.1vw,2rem)] font-semibold leading-[1.05] tracking-[-0.041em] text-white text-balance drop-shadow-[0_2px_10px_rgba(2,6,23,0.6)]">
              {useEnglishHeroWrap ? (
                <span>
                  <span className="block">{englishHeroTitleFirstLine}</span>
                  <span className="block">{englishHeroTitleSecondLine}</span>
                </span>
              ) : (
                heroTitle
              )}
            </h1>
            <p className="mt-4 max-w-[21rem] text-[clamp(0.72rem,3.28vw,0.89rem)] font-medium leading-[1.5] tracking-[-0.012em] text-white/92 text-balance drop-shadow-[0_2px_8px_rgba(2,6,23,0.54)]">
              {useEnglishHeroWrap ? (
                <span>
                  <span className="block">{englishHeroSubtitleFirstLine}</span>
                  <span className="block">{englishHeroSubtitleSecondLine}</span>
                </span>
              ) : (
                heroSubtitle
              )}
            </p>
          </div>
        </div>

        {/*
          Match the homepage mobile structure: the hero owns only the image/copy,
          and the search card is anchored to the hero's bottom edge instead of
          participating in normal flow. The following section reserves the card's
          height so content begins cleanly after the overlap.
        */}
        <div className="page-shell absolute inset-x-0 bottom-[-23.5rem] z-30">
          <div className="mx-auto max-w-6xl">
            <StandaloneFlightSearchForm localizeCalendarLabels mobileHeroCard />
          </div>
        </div>
      </section>

      <section className="relative hidden overflow-visible pb-28 sm:block lg:pb-32">
        <div className="relative isolate min-h-[32rem] bg-slate-950 lg:min-h-[36rem]">
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src={heroImageUrl}
              alt={t("flightLandingHeroImageAlt")}
              fill
              priority
              sizes="100vw"
              className="object-cover object-[55%_46%]"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950/68 via-slate-950/24 to-slate-950/8" />
            <div className="absolute inset-y-0 start-0 w-[76%] bg-gradient-to-r from-slate-950/74 via-slate-950/34 to-transparent" />
            <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-slate-950/48 via-slate-950/14 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-slate-950/76 via-slate-950/26 to-transparent" />
          </div>

          <div className="page-shell relative z-10 flex min-h-[32rem] flex-col items-start pb-36 pt-8 lg:min-h-[36rem] lg:pb-40 lg:pt-12">
            <div className="max-w-3xl pt-0 text-start text-white lg:pt-2">
              <h1 className="text-[2.65rem] font-semibold leading-[1.02] tracking-[-0.045em] text-white drop-shadow-[0_3px_18px_rgba(15,23,42,0.62)] lg:text-[3.55rem]">
                {heroTitle}
              </h1>
              <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-white/90 drop-shadow-[0_2px_12px_rgba(15,23,42,0.62)] lg:text-lg lg:leading-8">
                {heroSubtitle}
              </p>
            </div>
          </div>

          <div className="page-shell absolute inset-x-0 bottom-[-52px] z-30 lg:bottom-[-56px]">
            <div className="mx-auto max-w-6xl">
              <StandaloneFlightSearchForm localizeCalendarLabels />
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell mt-0 pt-[28rem] sm:mt-32 sm:pt-0 lg:mt-36">
        <div>
          <div className="mb-5 max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {t("discoverDestinationsFromRegion")}
            </h2>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-600 sm:text-base">
              {t("discoverDestinationsFromRegionBody")}
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {discoveryCards.map((item, index) => (
              <RouteCard key={item.id} item={item} priority={index < 2} t={t} />
            ))}
          </div>
        </div>
      </section>

      <section className="mt-14 border-y border-slate-200/90 bg-white sm:mt-16">
        <div className="page-shell py-7 sm:py-8 lg:py-9">
          <div className="divide-y divide-slate-200/70 sm:grid sm:grid-cols-3 sm:gap-5 sm:divide-y-0 sm:[&>article+article]:border-s sm:[&>article+article]:border-slate-200/70 sm:[&>article+article]:pl-5">
            {[
              {
                title: t("flightLandingFeatureSearchReadyTitle"),
                body: t("flightLandingFeatureSearchReadyBody"),
                illustration: <SearchReadyIllustration />,
                ringClassName: "ring-indigo-100/80",
              },
              {
                title: t("flightLandingFeatureCompareTitle"),
                body: t("flightLandingFeatureCompareBody"),
                illustration: <CompareFlightsIllustration />,
                ringClassName: "ring-violet-100/80",
              },
              {
                title: t("flightLandingFeatureProviderTitle"),
                body: t("flightLandingFeatureProviderBody"),
                illustration: <ProviderHandoffIllustration />,
                ringClassName: "ring-blue-100/80",
              },
            ].map(({ title, body, illustration, ringClassName }) => (
              <article
                key={title}
                className="flex items-start gap-3.5 py-4 first:pt-1 last:pb-1 sm:px-2 sm:py-2"
              >
                <div
                  className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ${ringClassName}`}
                >
                  {illustration}
                </div>
                <div>
                  <h2 className="text-base font-bold leading-6 text-slate-950">
                    {title}
                  </h2>
                  <p className="mt-1 text-sm font-medium leading-6 text-slate-700">
                    {body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-shell mt-32 space-y-12 sm:mt-36 lg:mt-40">
        {routeInspirationCards.length > 0 ? (
          <div>
            <div className="mb-5 max-w-3xl">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                {t("flightLandingRouteIdeasTitle")}
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600 sm:text-base">
                {t("flightLandingRouteIdeasBody")}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {routeInspirationCards.map((item) => {
                const routeText = getRouteText(item, t);

                return (
                  <Link
                    key={item.id}
                    href={buildDiscoveryLink(item)}
                    className="group block overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.055)] transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_16px_36px_rgba(79,70,229,0.11)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                  >
                    <article className="flex h-full flex-col">
                      <div className="relative h-32 overflow-hidden bg-slate-100">
                        <Image
                          src={item.image}
                          alt={routeText.imageAlt}
                          fill
                          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover transition duration-500 group-hover:scale-105 group-focus-visible:scale-105"
                        />
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <p className="text-[0.72rem] font-bold uppercase leading-4 tracking-[0.14em] text-indigo-700/85">
                          {item.originCode} → {item.destinationCode}
                        </p>
                        <h3 className="mt-3 text-lg font-bold leading-6 tracking-[-0.015em] text-slate-950">
                          {routeText.destinationCity}
                        </h3>
                        <p className="mt-2.5 line-clamp-2 text-sm font-medium leading-6 text-slate-600">
                          {routeText.routeNote}
                        </p>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}

        {beachVacationCards.length > 0 ? (
          <div>
            <div className="mb-5 max-w-3xl">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                {t("beachVacations")}
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600 sm:text-base">
                {t("beachVacationsBody")}
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {beachVacationCards.map((item) => (
                <RouteCard key={item.id} item={item} t={t} />
              ))}
            </div>
          </div>
        ) : null}

        <section aria-labelledby="flight-booking-faq-heading">
          <div className="max-w-3xl">
            <h2
              id="flight-booking-faq-heading"
              className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl"
            >
              {t("flightBookingFaqs")}
            </h2>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-600 sm:text-base">
              {t("flightBookingFaqIntro")}
            </p>
          </div>
          <FaqAccordion
            items={getFlightFaqItems(t)}
            columns="three"
            compact
            className="mt-4"
          />
        </section>
      </section>
    </main>
  );
}
