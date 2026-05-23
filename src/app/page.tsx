"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  CircleDollarSign,
  Heart,
  Hotel,
  Plane,
  ShieldCheck,
  Sparkles,
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
    city: "Dubai",
    country: "UAE",
    amountUsd: 420,
    image:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=700&q=80",
  },
  {
    city: "London",
    country: "United Kingdom",
    amountUsd: 380,
    image:
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=700&q=80",
  },
  {
    city: "Paris",
    country: "France",
    amountUsd: 410,
    image:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=700&q=80",
  },
  {
    city: "Bali",
    country: "Indonesia",
    amountUsd: 370,
    image:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=700&q=80",
  },
  {
    city: "New York",
    country: "USA",
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
  const assurances = [t("homeAssuranceBestPrice"), t("homeAssuranceCompare"), t("homeAssuranceSecure"), t("homeAssuranceSupport")];

  const handleNewsletterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newsletterEmail.trim()) {
      return;
    }

    setNewsletterMessage("Thanks! We’ll keep you posted with travel deals.");
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
              alt="Luxury tropical resort by calm water"
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />

            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.97)_4%,rgba(255,255,255,0.93)_37%,rgba(255,255,255,0.62)_58%,rgba(255,255,255,0.12)_100%)]" />

            <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#f8f7ff] via-[#f8f7ff]/75 to-transparent" />
          </div>

          <div className="page-shell relative pb-8 pt-6 sm:pb-10 sm:pt-8 lg:pt-10">
            <div className="grid min-h-[390px] content-start gap-4 pb-5 sm:min-h-[420px] sm:gap-5 sm:pb-6 lg:min-h-[450px] lg:max-w-[1000px]">
              <div className="space-y-3 pt-2">
                <p className="inline-flex rounded-full border border-[#d9ccff] bg-white/85 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#5b21d6] backdrop-blur">
                  {t("homeHeroBadge")}
                </p>

                <h1 className="max-w-3xl text-4xl font-black leading-[1.03] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                  {t("homeHeroTitle")}
                </h1>

                <p className="max-w-xl text-base font-semibold leading-7 text-slate-700 sm:text-lg sm:leading-8">
                  {t("homeHeroSubtitle")}
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {assurances.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-[#d9ccff] bg-white/90 px-3 py-1 text-xs font-bold text-[#5b21d6]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="relative z-10 mt-2 w-full max-w-[1080px]">
                <div className="rounded-2xl border border-white/85 bg-white/95 p-2 shadow-[0_24px_65px_-35px_rgba(15,23,42,0.45)] backdrop-blur-sm sm:rounded-3xl sm:p-3">
                  <SearchTabs
                    t={t as unknown as Record<string, string>}
                    compactHero
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="page-shell pb-6">
          <div className="grid gap-3 rounded-2xl border border-[#ece8ff] bg-[#f7f5ff] p-4 sm:grid-cols-2 lg:grid-cols-4">
            <article className="flex items-start gap-3 rounded-xl bg-white/70 p-3">
              <span className="mt-0.5 rounded-full bg-violet-100 p-2 text-[#5b21d6]">
                <BadgeCheck size={16} />
              </span>

              <div>
                <h2 className="text-sm font-extrabold text-slate-900">
                  {t("homeFeaturesMillionsTitle")}
                </h2>

                <p className="mt-0.5 text-xs font-semibold text-slate-600">
                  {t("homeFeaturesMillionsBody")}
                </p>
              </div>
            </article>

            <article className="flex items-start gap-3 rounded-xl bg-white/70 p-3">
              <span className="mt-0.5 rounded-full bg-violet-100 p-2 text-[#5b21d6]">
                <Ticket size={16} />
              </span>

              <div>
                <h2 className="text-sm font-extrabold text-slate-900">
                  {t("homeFeaturesFlexibleTitle")}
                </h2>

                <p className="mt-0.5 text-xs font-semibold text-slate-600">
                  {t("homeFeaturesFlexibleBody")}
                </p>
              </div>
            </article>

            <article className="flex items-start gap-3 rounded-xl bg-white/70 p-3">
              <span className="mt-0.5 rounded-full bg-violet-100 p-2 text-[#5b21d6]">
                <ShieldCheck size={16} />
              </span>

              <div>
                <h2 className="text-sm font-extrabold text-slate-900">
                  {t("homeFeaturesSecureTitle")}
                </h2>

                <p className="mt-0.5 text-xs font-semibold text-slate-600">
                  {t("homeFeaturesSecureBody")}
                </p>
              </div>
            </article>

            <article className="flex items-start gap-3 rounded-xl bg-white/70 p-3">
              <span className="mt-0.5 rounded-full bg-violet-100 p-2 text-[#5b21d6]">
                <WalletCards size={16} />
              </span>

              <div>
                <h2 className="text-sm font-extrabold text-slate-900">
                  {t("homeFeaturesDealsTitle")}
                </h2>

                <p className="mt-0.5 text-xs font-semibold text-slate-600">
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
              aria-label="Next destinations"
              className="absolute -right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow sm:flex"
            >
              <ChevronRight size={18} />
            </button>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {destinations.map((destination) => (
                <DestinationCard key={destination.city} {...destination} />
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
                aria-label="Email address"
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
  amountUsd,
  image,
}: {
  city: string;
  country: string;
  amountUsd: number;
  image: string;
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative h-44">
        <Image
          src={image}
          alt={`${city}, ${country}`}
          fill
          sizes="(min-width: 1024px) 20vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/10 to-transparent" />

        <button
          type="button"
          className="focus-ring absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur"
          aria-label={`Save ${city}`}
        >
          <Heart size={17} />
        </button>

        <div className="absolute bottom-3 left-3 text-white">
          <h3 className="text-xl font-black">{city}</h3>
          <p className="text-sm font-semibold">{country}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 p-4 text-sm font-bold text-slate-700">
        From <span className="text-lg font-black text-[#6d28d9]"><PriceText amountUsd={amountUsd} /></span>
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
