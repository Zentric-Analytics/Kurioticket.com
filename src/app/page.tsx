"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Compass,
  Heart,
  Hotel,
  Plane,
  SearchCheck,
  BadgeDollarSign,
  ShieldCheck,
  Sparkles,
  Mail,
} from "lucide-react";

import { PriceText } from "@/components/currency/PriceText";
import { AppHeader } from "@/components/layout/AppHeader";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { Footer } from "@/components/layout/Footer";
import { SearchTabs } from "@/components/search/SearchTabs";
import { LinkButton } from "@/components/ui/Button";
import { getHomeDiscoveryByRegion } from "@/data/homeDiscovery";
import { buildDiscoveryLink } from "@/lib/home/buildDiscoveryLinks";
import { getTranslations } from "@/lib/i18n";
import { translations as enTranslations } from "@/lib/i18n/en";

const heroImage =
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1800&q=85";

const destinations = [
  {
    id: "dubai",
    cityKey: "homeDestinationDubaiCity",
    countryKey: "homeDestinationDubaiCountry",
    altKey: "homeDestinationDubaiAlt",
    amountUsd: 420,
    image:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1400&q=90",
  },
  {
    id: "london",
    cityKey: "homeDestinationLondonCity",
    countryKey: "homeDestinationLondonCountry",
    altKey: "homeDestinationLondonAlt",
    amountUsd: 380,
    image:
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1400&q=90",
  },
  {
    id: "paris",
    cityKey: "homeDestinationParisCity",
    countryKey: "homeDestinationParisCountry",
    altKey: "homeDestinationParisAlt",
    amountUsd: 410,
    image:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1400&q=90",
  },
  {
    id: "bali",
    cityKey: "homeDestinationBaliCity",
    countryKey: "homeDestinationBaliCountry",
    altKey: "homeDestinationBaliAlt",
    amountUsd: 370,
    image:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1400&q=90",
  },
  {
    id: "new-york",
    cityKey: "homeDestinationNewYorkCity",
    countryKey: "homeDestinationNewYorkCountry",
    altKey: "homeDestinationNewYorkAlt",
    amountUsd: 390,
    image:
      "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?auto=format&fit=crop&w=1400&q=90",
  },
];

export default function Home() {
  const { locale } = useLocale();
  const { mode: regionCode } = useRegion();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterMessage, setNewsletterMessage] = useState("");
  const destinationsRailRef = useRef<HTMLDivElement>(null);

  const scrollDestinationsRail = (direction: "left" | "right") => {
    const rail = destinationsRailRef.current;

    if (!rail) return;

    const amount = Math.round(rail.clientWidth * 0.85);

    rail.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  const dictionary = useMemo(() => getTranslations(locale), [locale]);
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const discoveryItems = useMemo(() => getHomeDiscoveryByRegion(regionCode), [regionCode]);
  const mobileDiscoveryGroups = useMemo(() => {
    const groups = [];

    for (let index = 0; index < discoveryItems.length; index += 6) {
      groups.push(discoveryItems.slice(index, index + 6));
    }

    return groups;
  }, [discoveryItems]);

  const handleNewsletterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newsletterEmail.trim()) {
      return;
    }

    setNewsletterMessage(t("homeNewsletterThanks"));
    setNewsletterEmail("");
  };

  return (
    <>
      <AppHeader />

      <main className="flex-1 bg-white">
        <section className="relative overflow-visible bg-[#f8f7ff]">
          <div className="absolute inset-0">
            <Image
              src={heroImage}
              alt={t("homeHeroImageAlt")}
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />

            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.97)_4%,rgba(255,255,255,0.93)_37%,rgba(255,255,255,0.62)_58%,rgba(255,255,255,0.12)_100%)]" />

            <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#f8f7ff] via-[#f8f7ff]/75 to-transparent" />
          </div>

          <div className="page-shell relative pb-5 pt-24 sm:pb-6 sm:pt-28 lg:pt-32">
            <div className="grid content-start gap-3 pb-3 sm:gap-4 sm:pb-4 lg:max-w-[1200px]">
              <div className="space-y-2.5 pt-1">
                <h1 className="max-w-3xl text-4xl font-black leading-[1.03] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                  {t("homeHeroTitle")}
                </h1>

                <p className="max-w-xl text-base font-semibold leading-7 text-slate-700 sm:text-lg sm:leading-8">
                  {t("homeHeroSubtitle")}
                </p>
              </div>

              <div className="relative z-10 mt-0.5 w-full max-w-[1280px]">
                <SearchTabs
                  t={t as unknown as Record<string, string>}
                  compactHero
                />
              </div>
            </div>
          </div>
        </section>

        <section className="page-shell py-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold tracking-normal text-slate-900">
              {t("homePopularDestinations")}
            </h2>

            <LinkButton
              href="/hotels/tokyo"
              variant="ghost"
              size="sm"
              className="hidden text-[#6d28d9] sm:inline-flex"
            >
              {t("homeViewAllDestinations")}
              <ArrowRight size={16} />
            </LinkButton>
          </div>

          <div className="relative mt-6">
            <button
              type="button"
              aria-label="Previous destinations"
              onClick={() => scrollDestinationsRail("left")}
              className="focus-ring absolute -left-2 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-slate-600 shadow-[0_16px_30px_-20px_rgba(15,23,42,0.65)] transition hover:bg-white hover:text-slate-900 sm:flex"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              aria-label={t("homeNextDestinations")}
              onClick={() => scrollDestinationsRail("right")}
              className="focus-ring absolute -right-2 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-slate-600 shadow-[0_16px_30px_-20px_rgba(15,23,42,0.65)] transition hover:bg-white hover:text-slate-900 sm:flex"
            >
              <ChevronRight size={18} />
            </button>

            <div
              ref={destinationsRailRef}
              className="-mx-2 flex snap-x snap-mandatory gap-5 overflow-x-auto px-2 pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {destinations.map((destination) => (
                <DestinationCard
                  key={destination.id}
                  city={t(destination.cityKey)}
                  country={t(destination.countryKey)}
                  imageAlt={t(destination.altKey)}
                  fromLabel={t("fromPrice")}
                  saveLabelTemplate={t("homeSaveDestination")}
                  amountUsd={destination.amountUsd}
                  image={destination.image}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="page-shell bg-transparent py-5 sm:py-6">
          <div className="space-y-4 sm:space-y-5">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.75rem]">
                Discover your next adventure here
              </h2>
              <p className="text-sm font-normal leading-6 text-slate-600 sm:text-base">
                Compare smart route ideas, flexible fares, and destinations picked for your region.
              </p>
            </div>
            <div className="flex items-center justify-end sm:hidden">
              <div className="pointer-events-none mb-2 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                Swipe for more
                <ChevronRight size={13} className="text-slate-500" />
              </div>
            </div>
            <div className="-mx-1.5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1.5 pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:hidden">
              {mobileDiscoveryGroups.map((group, groupIndex) => (
                <div key={`group-${groupIndex}`} className="grid min-w-full snap-start grid-cols-2 gap-2.5">
                  {group.map((item) => {
                    return (
                      <Link
                        key={item.id}
                        href={buildDiscoveryLink(item)}
                        className="group flex min-h-[80px] min-w-0 items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-[0_14px_24px_-20px_rgba(15,23,42,0.38)] transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_26px_-22px_rgba(15,23,42,0.62)]"
                      >
                        <div className="relative h-[56px] w-[68px] shrink-0 overflow-hidden rounded-lg">
                          <DiscoveryCardImage
                            image={item.image}
                            imageAlt={item.imageAlt}
                            destinationCode={item.destinationCode}
                          />
                        </div>

                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 break-words text-sm font-extrabold leading-5 text-slate-900">
                              {item.title}
                            </p>
                            <p className="shrink-0 text-sm font-extrabold leading-tight text-slate-900">${item.priceFromUsd}</p>
                          </div>
                          <p className="line-clamp-2 text-xs font-medium leading-5 text-slate-700">
                            {item.originCode} → {item.destinationCode} · {item.routeNote}
                          </p>
                          <p className="text-xs font-semibold uppercase tracking-[0.07em] text-slate-500">
                            One way · Economy · 1 traveler
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="hidden grid-cols-3 gap-3 sm:grid md:grid-cols-4 lg:grid-cols-4">
              {discoveryItems.map((item) => {
                return (
                  <Link
                    key={item.id}
                    href={buildDiscoveryLink(item)}
                    className="group flex min-w-0 items-center gap-3.5 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-[0_14px_24px_-20px_rgba(15,23,42,0.38)] transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_28px_-22px_rgba(15,23,42,0.62)]"
                  >
                    <div className="relative h-[72px] w-[92px] shrink-0 overflow-hidden rounded-lg">
                      <DiscoveryCardImage
                        image={item.image}
                        imageAlt={item.imageAlt}
                        destinationCode={item.destinationCode}
                      />
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-base font-semibold leading-6 text-slate-800">
                          {item.title}
                        </p>
                        <p className="shrink-0 text-base font-semibold leading-tight text-slate-800">${item.priceFromUsd}</p>
                      </div>
                      <p className="line-clamp-2 text-sm font-medium leading-6 text-slate-700">
                        {item.originCode} → {item.destinationCode} · {item.routeNote}
                      </p>
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                        One way · Economy · 1 traveler
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="page-shell bg-transparent py-4 sm:py-5">
          <div className="space-y-3">
            <div className="max-w-3xl space-y-1.5">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">
                {t("homeTrustTitle")}
              </h2>
              <p className="text-sm font-medium leading-6 text-slate-700 sm:text-base">
                {t("homeTrustSubtitle")}
              </p>
            </div>

            <div className="mt-4 divide-y divide-slate-200/70 md:grid md:grid-cols-3 md:gap-6 md:divide-y-0 md:[&>article+article]:border-l md:[&>article+article]:border-slate-200/70 md:[&>article+article]:pl-6">
              <article className="flex items-start gap-3.5 py-3.5 first:pt-1 last:pb-1 md:px-2 md:py-2">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                  <SearchCheck size={20} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-base font-bold leading-6 text-slate-900">{t("homeTrustCompareTitle")}</h3>
                  <p className="mt-1 text-sm font-medium leading-6 text-slate-700">
                    {t("homeTrustCompareBody")}
                  </p>
                </div>
              </article>

              <article className="flex items-start gap-3.5 py-3.5 first:pt-1 last:pb-1 md:px-2 md:py-2">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                  <BadgeDollarSign size={20} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-base font-bold leading-6 text-slate-900">{t("homeTrustPricingTitle")}</h3>
                  <p className="mt-1 text-sm font-medium leading-6 text-slate-700">
                    {t("homeTrustPricingBody")}
                  </p>
                </div>
              </article>

              <article className="flex items-start gap-3.5 py-3.5 first:pt-1 last:pb-1 md:px-2 md:py-2">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                  <ShieldCheck size={20} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-base font-bold leading-6 text-slate-900">{t("homeTrustHandoffTitle")}</h3>
                  <p className="mt-1 text-sm font-medium leading-6 text-slate-700">
                    {t("homeTrustHandoffBody")}
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="page-shell grid gap-5 py-9 lg:grid-cols-2">
          <PromoPanel
            tone="violet"
            title={t("homePromoFlightsTitle")}
            body={t("homePromoFlightsBody")}
            cta={t("homePromoFlightsCta")}
            href="/deals"
            icon={<Plane size={74} />}
          />

          <PromoPanel
            tone="amber"
            title={t("homePromoHotelsTitle")}
            body={t("homePromoHotelsBody")}
            cta={t("homePromoHotelsCta")}
            href="/hotels/results"
            icon={<Hotel size={74} />}
          />
        </section>

        <section className="page-shell pb-12 pt-2 sm:pt-3">
          <div className="max-w-3xl space-y-2">
            <h2 className="text-2xl font-black tracking-normal text-slate-950">
              Frequently asked questions
            </h2>
            <p className="text-sm font-medium leading-6 text-slate-700 sm:text-base">
              Learn how Curioticket helps you compare flights, hotels, and travel options before booking with trusted providers.
            </p>
          </div>

          <div className="mt-5 grid gap-x-8 gap-y-1 md:grid-cols-2">
              {[
                {
                  question: "How does Curioticket find flight and hotel options?",
                  answer:
                    "Curioticket searches live offers from travel providers and brings options together in one place so you can compare prices, routes, stays, and details before choosing.",
                },
                {
                  question:
                    "Does Curioticket sell tickets or hotel rooms directly?",
                  answer:
                    "Curioticket helps you compare travel options. When you choose an offer, you are sent to the selected provider to review details and complete the booking on that provider’s site.",
                },
                {
                  question: "Why can prices change after I click an offer?",
                  answer:
                    "Prices and availability can change in real time because airlines, hotels, and travel providers update inventory frequently. Always review the final price on the provider’s checkout page before booking.",
                },
                {
                  question:
                    "Can I compare multiple providers for the same trip?",
                  answer:
                    "Yes. Curioticket is designed to help you compare options side by side so you can evaluate price, timing, route details, hotel details, and overall value.",
                },
                {
                  question: "How do I complete my booking securely?",
                  answer:
                    "Booking and payment are completed on the provider’s checkout flow. You should always review the provider’s terms, cancellation policy, and final price before confirming.",
                },
                {
                  question: "Can I set currency and language preferences?",
                  answer:
                    "Yes. Curioticket supports language and region preferences so the experience can feel more relevant based on how you prefer to search and compare travel options.",
                },
                {
                  question: "Are search results live or cached?",
                  answer:
                    "Curioticket uses provider search results that can refresh as availability and prices change. This helps show current options, but final availability is confirmed by the provider.",
                },
                {
                  question: "Where do I manage changes or cancellations?",
                  answer:
                    "Trip changes, cancellations, refunds, and booking support are usually handled by the provider where the booking was completed. Use the confirmation details from that provider for service requests.",
                },
              ].map((item) => (
                <details
                  key={item.question}
                  className="group border-b border-slate-200 py-4"
                >
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-sm font-semibold leading-6 text-slate-900 marker:hidden sm:text-base">
                    <span>{item.question}</span>
                    <span
                      aria-hidden="true"
                      className="mt-0.5 text-base leading-none text-slate-500 transition-transform duration-200 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-700 sm:text-base">
                    {item.answer}
                  </p>
                </details>
              ))}
          </div>
        </section>

        <section className="page-shell pb-6 sm:pb-8">
          <div className="w-full max-w-[820px]">
            <div className="rounded-lg border border-slate-200/80 bg-violet-50/70 p-3 sm:p-3.5">
              <div className="flex flex-row items-center gap-1.5 sm:gap-2.5 lg:gap-3.5">
                <div className="flex shrink-0 items-center gap-1.5 sm:min-w-0 sm:basis-[34%] sm:gap-2.5 lg:basis-[34%] lg:max-w-[31ch]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 sm:h-10 sm:w-10">
                    <Mail className="size-5 sm:size-[22px]" />
                  </span>

                  <div className="hidden min-w-0 max-w-[17ch] space-y-0 sm:block lg:max-w-[24ch]">
                    <h2 className="truncate text-xs font-black leading-tight text-slate-950 sm:text-sm">
                      {t("homeNewsletterTitle")}
                    </h2>

                    <p className="hidden truncate text-xs font-semibold leading-5 text-slate-700 min-[420px]:block sm:text-sm">
                      {t("homeNewsletterBody")}
                    </p>
                  </div>
                </div>

                <form
                  className="flex min-w-0 flex-1 flex-row items-center gap-1.5 sm:basis-auto sm:gap-2 lg:basis-[66%] lg:flex-nowrap lg:justify-end"
                  onSubmit={handleNewsletterSubmit}
                >
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(event) => setNewsletterEmail(event.target.value)}
                    placeholder={t("homeNewsletterPlaceholder")}
                    className="focus-ring h-9 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-950 shadow-sm placeholder:text-slate-400 sm:h-11 sm:min-w-[12rem] sm:px-3.5 sm:text-sm lg:min-w-[20rem] lg:max-w-[30rem]"
                    aria-label={t("homeEmailAddress")}
                    required
                  />

                  <button
                    type="submit"
                    className="focus-ring h-9 w-auto shrink-0 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 text-xs font-extrabold text-white transition hover:bg-slate-800 sm:h-11 sm:px-5 sm:text-sm"
                  >
                    {t("homeSubscribe")}
                  </button>
                </form>
              </div>

              {newsletterMessage ? (
                <p className="mt-2 text-xs font-semibold text-slate-700 sm:text-sm">
                  {newsletterMessage}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

function DiscoveryCardImage({
  image,
  imageAlt,
  destinationCode,
}: {
  image: string;
  imageAlt: string;
  destinationCode: string;
}) {
  const [hasError, setHasError] = useState(false);
  const hasImage = Boolean(image?.trim());

  if (!hasImage || hasError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-violet-200 via-fuchsia-100 to-cyan-100 text-slate-700">
        <Compass size={14} className="opacity-80" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">
          Destination
        </span>
        <span className="text-[11px] font-black tracking-[0.12em] text-slate-800">
          {destinationCode}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={image}
      alt={imageAlt}
      fill
      sizes="(min-width: 1280px) 7rem, (min-width: 640px) 6.5rem, 5rem"
      className="object-cover transition duration-500 group-hover:scale-[1.03]"
      onError={() => setHasError(true)}
    />
  );
}

function DestinationCard({
  city,
  country,
  imageAlt,
  amountUsd,
  image,
  fromLabel,
  saveLabelTemplate,
}: {
  city: string;
  country: string;
  imageAlt: string;
  amountUsd: number;
  image: string;
  fromLabel: string;
  saveLabelTemplate: string;
}) {
  return (
    <article className="group min-w-[18.5rem] flex-[0_0_18.5rem] snap-start overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_14px_32px_-24px_rgba(15,23,42,0.65)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_45px_-26px_rgba(15,23,42,0.75)] sm:min-w-[22rem] sm:flex-[0_0_22rem]">
      <Link
        href={`/hotels/results?destination=${encodeURIComponent(city)}`}
        className="focus-ring block"
      >
        <div className="relative h-56 sm:h-64">
          <Image
            src={image}
            alt={imageAlt}
            fill
            sizes="(min-width: 1280px) 22rem, (min-width: 640px) 22rem, 18.5rem"
            className="object-cover transition duration-500 group-hover:scale-105"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/45 to-slate-900/5" />

          <button
            type="button"
            className="focus-ring absolute right-3 top-3 z-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/30"
            aria-label={saveLabelTemplate.replace("{{city}}", city)}
            onClick={(event) => event.preventDefault()}
          >
            <Heart size={17} />
          </button>

          <div className="absolute bottom-4 left-4 text-white">
            <h3 className="text-2xl font-black tracking-tight drop-shadow-sm">
              {city}
            </h3>
            <p className="text-sm font-semibold text-white/95">{country}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-4">
          <span className="text-sm font-semibold text-slate-600">
            {fromLabel}
          </span>
          <span className="text-xl font-semibold text-slate-800">
            <PriceText amountUsd={amountUsd} />
          </span>
        </div>
      </Link>
    </article>
  );
}

function PromoPanel({
  tone,
  title,
  body,
  cta,
  href,
  icon,
}: {
  tone: "violet" | "amber";
  title: string;
  body: string;
  cta: string;
  href: string;
  icon: ReactNode;
}) {
  const isViolet = tone === "violet";

  return (
    <article
      className={`relative min-h-56 overflow-hidden rounded-xl p-8 ${
        isViolet ? "bg-[#f1e8ff]" : "bg-[#eaf2ff]"
      }`}
    >
      <div className="relative z-10 max-w-xs">
        <h2 className="text-2xl font-black leading-tight text-slate-950">
          {title}
        </h2>

        <p className="mt-4 text-sm font-semibold leading-6 text-slate-700">
          {body}
        </p>

        <LinkButton
          href={href}
          variant="primary"
          size="md"
          className={`mt-5 ${
            isViolet
              ? "bg-[#5b21d6] hover:bg-[#4c1d95]"
              : "bg-[#2563eb] hover:bg-[#1d4ed8]"
          }`}
        >
          {cta}
          <ArrowRight size={16} />
        </LinkButton>
      </div>

      <div
        className={`absolute bottom-5 right-6 flex h-40 w-40 items-center justify-center rounded-full ${
          isViolet ? "bg-white/55 text-[#6d28d9]" : "bg-white/70 text-[#2563eb]"
        }`}
      >
        <Sparkles className="absolute left-5 top-5 opacity-40" size={24} />

        <CircleDollarSign
          className="absolute right-7 top-7 opacity-40"
          size={26}
        />

        {icon}
      </div>
    </article>
  );
}
