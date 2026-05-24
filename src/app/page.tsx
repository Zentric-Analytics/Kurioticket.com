"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  ChevronRight,
  CircleDollarSign,
  Compass,
  Filter,
  Heart,
  Hotel,
  Network,
  Plane,
  ShieldCheck,
  Sparkles,
  SlidersHorizontal,
  Ticket,
  WalletCards,
} from "lucide-react";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { SearchTabs } from "@/components/search/SearchTabs";
import { LinkButton } from "@/components/ui/Button";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { PriceText } from "@/components/currency/PriceText";

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
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "london",
    cityKey: "homeDestinationLondonCity",
    countryKey: "homeDestinationLondonCountry",
    altKey: "homeDestinationLondonAlt",
    amountUsd: 380,
    image:
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "paris",
    cityKey: "homeDestinationParisCity",
    countryKey: "homeDestinationParisCountry",
    altKey: "homeDestinationParisAlt",
    amountUsd: 410,
    image:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "bali",
    cityKey: "homeDestinationBaliCity",
    countryKey: "homeDestinationBaliCountry",
    altKey: "homeDestinationBaliAlt",
    amountUsd: 370,
    image:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "new-york",
    cityKey: "homeDestinationNewYorkCity",
    countryKey: "homeDestinationNewYorkCountry",
    altKey: "homeDestinationNewYorkAlt",
    amountUsd: 390,
    image:
      "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?auto=format&fit=crop&w=700&q=80",
  },
];

export default function Home() {
  const { locale } = useLocale();
  const { selectedOption } = useRegion();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterMessage, setNewsletterMessage] = useState("");

  const dictionary = useMemo(() => getTranslations(locale), [locale]);
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";

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

          <div className="page-shell relative pb-5 pt-28 sm:pb-6 sm:pt-32 lg:pt-36">
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

        <section className="page-shell bg-transparent pb-8 pt-1">
          <div className="grid gap-5 bg-transparent sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:gap-7">
            <article className="flex flex-col items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_34px_-24px_rgba(15,23,42,0.34)] sm:gap-5 sm:p-6">
              <span className="relative inline-flex h-[4.6rem] w-[4.6rem] shrink-0 items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-violet-100 via-indigo-50 to-fuchsia-100 text-[#5b21d6] shadow-[0_10px_26px_-16px_rgba(79,70,229,0.7)] ring-1 ring-violet-200/70 sm:h-[5.2rem] sm:w-[5.2rem]">
                <span className="absolute left-2 top-2 h-3 w-3 rounded-full bg-white/80" />
                <span className="absolute -bottom-1.5 -right-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full border border-violet-200 bg-white text-indigo-500 shadow-sm">
                  <Compass size={14} strokeWidth={2.4} />
                </span>
                <Network size={32} strokeWidth={2.2} />
              </span>

              <div className="space-y-2.5">
                <h2 className="text-base font-black leading-tight text-slate-900 sm:text-lg">
                  {t("homeFeaturesMillionsTitle")}
                </h2>

                <p className="text-sm font-medium leading-6 text-slate-700 sm:text-[15px]">
                  {t("homeFeaturesMillionsBody")}
                </p>
              </div>
            </article>

            <article className="flex flex-col items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_34px_-24px_rgba(15,23,42,0.34)] sm:gap-5 sm:p-6">
              <span className="relative inline-flex h-[4.6rem] w-[4.6rem] shrink-0 items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-indigo-100 via-violet-50 to-sky-100 text-indigo-600 shadow-[0_10px_26px_-16px_rgba(99,102,241,0.72)] ring-1 ring-indigo-200/80 sm:h-[5.2rem] sm:w-[5.2rem]">
                <span className="absolute right-2 top-2 h-3 w-3 rounded-full bg-white/80" />
                <span className="absolute -bottom-1.5 -right-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full border border-indigo-200 bg-white text-violet-500 shadow-sm">
                  <SlidersHorizontal size={14} strokeWidth={2.4} />
                </span>
                <Filter size={32} strokeWidth={2.3} />
              </span>

              <div className="space-y-2.5">
                <h2 className="text-base font-black leading-tight text-slate-900 sm:text-lg">
                  {t("homeFeaturesFlexibleTitle")}
                </h2>

                <p className="text-sm font-medium leading-6 text-slate-700 sm:text-[15px]">
                  {t("homeFeaturesFlexibleBody")}
                </p>
              </div>
            </article>

            <article className="flex flex-col items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_34px_-24px_rgba(15,23,42,0.34)] sm:gap-5 sm:p-6">
              <span className="relative inline-flex h-[4.6rem] w-[4.6rem] shrink-0 items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100 text-teal-700 shadow-[0_10px_26px_-16px_rgba(20,184,166,0.6)] ring-1 ring-emerald-200/80 sm:h-[5.2rem] sm:w-[5.2rem]">
                <span className="absolute left-2 top-2 h-3 w-3 rounded-full bg-white/80" />
                <span className="absolute -bottom-1.5 -right-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-500 shadow-sm">
                  <BadgeCheck size={14} strokeWidth={2.5} />
                </span>
                <ShieldCheck size={32} strokeWidth={2.3} />
              </span>

              <div className="space-y-2.5">
                <h2 className="text-base font-black leading-tight text-slate-900 sm:text-lg">
                  {t("homeFeaturesSecureTitle")}
                </h2>

                <p className="text-sm font-medium leading-6 text-slate-700 sm:text-[15px]">
                  {t("homeFeaturesSecureBody")}
                </p>
              </div>
            </article>

            <article className="flex flex-col items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_34px_-24px_rgba(15,23,42,0.34)] sm:gap-5 sm:p-6">
              <span className="relative inline-flex h-[4.6rem] w-[4.6rem] shrink-0 items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100 text-orange-600 shadow-[0_10px_26px_-16px_rgba(249,115,22,0.62)] ring-1 ring-amber-200/80 sm:h-[5.2rem] sm:w-[5.2rem]">
                <span className="absolute right-2 top-2 h-3 w-3 rounded-full bg-white/80" />
                <span className="absolute -bottom-1.5 -right-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full border border-orange-200 bg-white text-rose-500 shadow-sm">
                  <BellRing size={14} strokeWidth={2.4} />
                </span>
                <CircleDollarSign size={32} strokeWidth={2.3} />
              </span>

              <div className="space-y-2.5">
                <h2 className="text-base font-black leading-tight text-slate-900 sm:text-lg">
                  {t("homeFeaturesDealsTitle")}
                </h2>

                <p className="text-sm font-medium leading-6 text-slate-700 sm:text-[15px]">
                  {t("homeFeaturesDealsBody")}
                </p>
              </div>
            </article>
          </div>
        </section>

        <section className="page-shell py-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black tracking-normal text-slate-950">
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
              aria-label={t("homeNextDestinations")}
              className="absolute -right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow sm:flex"
            >
              <ChevronRight size={18} />
            </button>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
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

        <section className="page-shell grid gap-5 py-9 lg:grid-cols-2">
          <PromoPanel
            tone="violet"
            title={t("homePromoFlightsTitle")}
            body={
              t("homePromoFlightsBody")
            }
            cta={t("homePromoFlightsCta")}
            href="/deals"
            icon={<Plane size={74} />}
          />

          <PromoPanel
            tone="amber"
            title={t("homePromoHotelsTitle")}
            body={
              t("homePromoHotelsBody")
            }
            cta={t("homePromoHotelsCta")}
            href="/hotels/results"
            icon={<Hotel size={74} />}
          />
        </section>

        <section className="page-shell pb-12">
          <div className="grid gap-5 rounded-xl bg-[#f3eafe] p-5 md:grid-cols-[1fr_minmax(280px,520px)] md:items-center">
            <div className="flex items-start gap-4">
              <span className="rounded-full bg-violet-100 p-2 text-[#5b21d6]">
                <Ticket size={18} />
              </span>

              <div>
                <h2 className="text-lg font-black text-slate-950">
                  {t("homeNewsletterTitle")}
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-600">
                  {t("homeNewsletterBody")}
                </p>
              </div>
            </div>

            <form
              className="flex flex-col gap-3 sm:flex-row"
              onSubmit={handleNewsletterSubmit}
            >
              <input
                type="email"
                value={newsletterEmail}
                onChange={(event) => setNewsletterEmail(event.target.value)}
                placeholder={
                  t("homeNewsletterPlaceholder")
                }
                className="focus-ring h-12 min-w-0 flex-1 rounded-md border border-white bg-white px-4 text-sm font-semibold text-slate-950 placeholder:text-slate-400"
                aria-label={t("homeEmailAddress")}
                required
              />

              <button
                type="submit"
                className="focus-ring h-12 rounded-md bg-[#5b21d6] px-8 text-sm font-extrabold text-white transition hover:bg-[#4c1d95]"
              >
                {t("homeSubscribe")}
              </button>
            </form>

            {newsletterMessage ? (
              <p className="text-sm font-semibold text-[#4c1d95]">
                {newsletterMessage}
              </p>
            ) : null}
          </div>
        </section>
      </main>

      <Footer />
    </>
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
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative h-44">
        <Image
          src={image}
          alt={imageAlt}
          fill
          sizes="(min-width: 1024px) 20vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/10 to-transparent" />

        <button
          type="button"
          className="focus-ring absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur"
          aria-label={saveLabelTemplate.replace("{{city}}", city)}
        >
          <Heart size={17} />
        </button>

        <div className="absolute bottom-3 left-3 text-white">
          <h3 className="text-xl font-black">{city}</h3>
          <p className="text-sm font-semibold">{country}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 p-4 text-sm font-bold text-slate-700">
        {fromLabel} <span className="text-lg font-black text-[#6d28d9]"><PriceText amountUsd={amountUsd} /></span>
      </div>
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
        isViolet ? "bg-[#f1e8ff]" : "bg-[#fff3e3]"
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
              : "bg-[#e87817] hover:bg-[#c75f0b]"
          }`}
        >
          {cta}
          <ArrowRight size={16} />
        </LinkButton>
      </div>

      <div
        className={`absolute bottom-5 right-6 flex h-40 w-40 items-center justify-center rounded-full ${
          isViolet ? "bg-white/55 text-[#6d28d9]" : "bg-white/70 text-[#e87817]"
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
