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

function RouteCard({
  item,
  priority = false,
}: {
  item: HomeDiscoveryItem;
  priority?: boolean;
}) {
  return (
    <Link
      href={buildDiscoveryLink(item)}
      aria-label={`Search flights from ${item.originCity} to ${item.destinationCity}`}
      className="group block overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.07)] transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_18px_42px_rgba(79,70,229,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
    >
      <article className="flex h-full flex-col">
        <div className="relative h-40 overflow-hidden bg-slate-100">
          <Image
            src={item.image}
            alt={item.imageAlt}
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
            {item.title}
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-700">
            {item.originCity} to {item.destinationCity}
          </p>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
            {item.routeNote}
          </p>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-indigo-700">
            Start this search
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

  return (
    <main className="flex-1 bg-[radial-gradient(circle_at_top,_#eef4ff_0%,_#f8fafd_42%,_#f2f6fc_100%)] pb-12 pt-4 sm:pt-8">
      <section className="page-shell">
        <div className="mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-indigo-700 shadow-sm">
            <Sparkles className="h-4 w-4" />
            Flights
          </div>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Find flights for your next trip
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-base font-medium leading-7 text-slate-600 sm:text-lg">
            Search routes, compare dates, and explore flight options for your
            next journey.
          </p>
        </div>

        <div className="mx-auto mt-7 max-w-6xl rounded-[2rem] border border-white/80 bg-white/85 p-3 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur sm:p-5">
          <StandaloneFlightSearchForm variant="flightLanding" />
        </div>

        <div className="mx-auto mt-6 grid max-w-6xl gap-3 sm:grid-cols-3">
          {[
            {
              title: "Search-ready routes",
              body: "Enter real trip details before results are requested from flight providers.",
              icon: SearchCheck,
            },
            {
              title: "Compare in context",
              body: "Use dates, traveler counts, cabin, duration, stops, and route details to evaluate options.",
              icon: Plane,
            },
            {
              title: "Provider review",
              body: "Always confirm final availability, price, and rules with the provider before booking.",
              icon: ShieldCheck,
            },
          ].map(({ title, body, icon: Icon }) => (
            <article
              key={title}
              className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
            >
              <Icon className="h-5 w-5 text-indigo-700" aria-hidden="true" />
              <h2 className="mt-3 text-base font-extrabold text-slate-950">
                {title}
              </h2>
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
              <RouteCard key={item.id} item={item} priority={index < 2} />
            ))}
          </div>
        </div>

        {routeInspirationCards.length > 0 ? (
          <div>
            <div className="mb-5 max-w-3xl">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                Route ideas for flexible trips
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600 sm:text-base">
                Browse route ideas, then start a real search with dates and
                travelers before comparing available flights.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {routeInspirationCards.map((item) => (
                <Link
                  key={item.id}
                  href={buildDiscoveryLink(item)}
                  className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-700">
                    {item.originCode} → {item.destinationCode}
                  </p>
                  <h3 className="mt-2 text-base font-extrabold text-slate-950">
                    {item.destinationCity}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                    {item.routeNote}
                  </p>
                </Link>
              ))}
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
                <RouteCard key={item.id} item={item} />
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
