"use client";

import Image from "next/image";
import Link from "next/link";
import { Plane, SearchCheck, ShieldCheck, Sparkles } from "lucide-react";

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
    originCity: getDiscoveryTranslation("flightLandingCity", item.originCity, t),
    destinationCity: getDiscoveryTranslation(
      "flightLandingCity",
      item.destinationCity,
      t,
    ),
    imageAlt: getDiscoveryTranslation("flightLandingImageAlt", item.imageAlt, t),
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
  const routeConnector = t("flightLandingRouteConnector");

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
          <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-indigo-700 shadow-sm backdrop-blur">
            {item.originCode} → {item.destinationCode}
          </div>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <h3 className="text-lg font-extrabold tracking-tight text-slate-950">
            {routeText.title}
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-700">
            {routeText.originCity} {routeConnector} {routeText.destinationCity}
          </p>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
            {routeText.routeNote}
          </p>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-indigo-700">
            {t("flightLandingStartThisSearch")}
            <Plane className="h-4 w-4 transition group-hover:translate-x-0.5" />
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

  const discoveryCards = getHomeDiscoveryByRegion(selectedOption.code).slice(0, 4);
  const discoveryIds = new Set(discoveryCards.map((item) => item.id));
  const beachVacationCards = getBeachVacationCards(selectedOption.code, discoveryIds);
  const routeInspirationCards = getHomeDiscoveryByRegion(selectedOption.code)
    .filter((item) => !discoveryIds.has(item.id))
    .slice(0, 8);

  return (
    <main className="flex-1 bg-slate-50 pb-12 pt-5 sm:pt-8">
      <section className="page-shell">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-indigo-700 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            {t("flights")}
          </div>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            {t("flightLandingHeroTitle")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-7 text-slate-600 sm:text-lg">
            {t("flightLandingHeroSubtitle")}
          </p>
        </div>

        <div className="mx-auto mt-7 max-w-6xl">
          <StandaloneFlightSearchForm />
        </div>

        <div className="mx-auto mt-5 grid max-w-6xl gap-3 sm:grid-cols-3">
          {[
            {
              title: t("flightLandingFeatureSearchReadyTitle"),
              body: t("flightLandingFeatureSearchReadyBody"),
              icon: SearchCheck,
            },
            {
              title: t("flightLandingFeatureCompareTitle"),
              body: t("flightLandingFeatureCompareBody"),
              icon: Plane,
            },
            {
              title: t("flightLandingFeatureProviderTitle"),
              body: t("flightLandingFeatureProviderBody"),
              icon: ShieldCheck,
            },
          ].map(({ title, body, icon: Icon }) => (
            <article
              key={title}
              className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
            >
              <Icon className="h-5 w-5 text-indigo-700" aria-hidden="true" />
              <h2 className="mt-3 text-base font-extrabold text-slate-950">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-shell mt-12 space-y-12">
        <div>
          <div className="mb-5 max-w-3xl">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
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
                    className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                  >
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-700">
                      {item.originCode} → {item.destinationCode}
                    </p>
                    <h3 className="mt-2 text-base font-extrabold text-slate-950">
                      {routeText.destinationCity}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                      {routeText.routeNote}
                    </p>
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
