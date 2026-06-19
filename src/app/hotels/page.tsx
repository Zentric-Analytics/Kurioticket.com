"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Building2, Calendar, ClipboardCheck } from "lucide-react";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { useLocale } from "@/components/layout/LocaleProvider";
import { HotelSearchBar } from "@/components/search/HotelSearchBar";
import { validateDestinationImages } from "@/data/destinationImageValidation";
import { translations as enTranslations } from "@/lib/i18n/en";

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return toIsoDate(next);
};

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

type HotelDestinationCard = {
  title: string;
  subtitle: string;
  destinationQuery: string;
  image: string;
  imageAlt: string;
  linkLabel: string;
};

const hotelsHeroImage =
  "/images/premium/hotels/kurioticket-hotels-hero-bellboy-guest-arrival-lobby-001.jpg";
const hotelsHeroImageAlt =
  "Hotel bellboy welcoming a guest with luggage in a premium lobby";

const hotelDestinationCards: HotelDestinationCard[] = [
  {
    title: enTranslations["hotelDestination.Tokyo.title"],
    subtitle: enTranslations["hotelDestination.Tokyo.subtitle"],
    destinationQuery: "Tokyo",
    image:
      "https://images.pexels.com/photos/31344755/pexels-photo-31344755.jpeg?auto=compress&cs=tinysrgb&w=1200",
    imageAlt: "Tokyo skyline with dense high-rise buildings in daylight",
    linkLabel: enTranslations["hotelDestination.Tokyo.linkLabel"],
  },
  {
    title: enTranslations["hotelDestination.London.title"],
    subtitle: enTranslations["hotelDestination.London.subtitle"],
    destinationQuery: "London",
    image:
      "https://images.pexels.com/photos/33843218/pexels-photo-33843218.jpeg?auto=compress&cs=tinysrgb&w=1200",
    imageAlt: "Tower Bridge and the River Thames in London under a blue sky",
    linkLabel: enTranslations["hotelDestination.London.linkLabel"],
  },
  {
    title: enTranslations["hotelDestination.Paris.title"],
    subtitle: enTranslations["hotelDestination.Paris.subtitle"],
    destinationQuery: "Paris",
    image:
      "https://images.pexels.com/photos/2082103/pexels-photo-2082103.jpeg?auto=compress&cs=tinysrgb&w=1200",
    imageAlt: "Eiffel Tower and the Seine River in Paris at golden hour",
    linkLabel: enTranslations["hotelDestination.Paris.linkLabel"],
  },
  {
    title: enTranslations["hotelDestination.New York.title"],
    subtitle: enTranslations["hotelDestination.New York.subtitle"],
    destinationQuery: "New York",
    image:
      "https://images.pexels.com/photos/11182439/pexels-photo-11182439.jpeg?auto=compress&cs=tinysrgb&w=1200",
    imageAlt:
      "New York City skyline with One World Trade Center and waterfront",
    linkLabel: enTranslations["hotelDestination.New York.linkLabel"],
  },
];

const moreHotelDestinationCards: HotelDestinationCard[] = [
  {
    title: enTranslations["hotelDestination.Rome.title"],
    subtitle: enTranslations["hotelDestination.Rome.subtitle"],
    destinationQuery: "Rome",
    image:
      "https://images.pexels.com/photos/1701595/pexels-photo-1701595.jpeg?auto=compress&cs=tinysrgb&w=1200",
    imageAlt: "The Colosseum in Rome beneath a clear blue sky",
    linkLabel: enTranslations["hotelDestination.Rome.linkLabel"],
  },
  {
    title: enTranslations["hotelDestination.Dubai.title"],
    subtitle: enTranslations["hotelDestination.Dubai.subtitle"],
    destinationQuery: "Dubai",
    image:
      "https://images.pexels.com/photos/21765772/pexels-photo-21765772.jpeg?auto=compress&cs=tinysrgb&w=1200",
    imageAlt: "Dubai skyline with the Burj Khalifa rising above skyscrapers",
    linkLabel: enTranslations["hotelDestination.Dubai.linkLabel"],
  },
  {
    title: enTranslations["hotelDestination.Singapore.title"],
    subtitle: enTranslations["hotelDestination.Singapore.subtitle"],
    destinationQuery: "Singapore",
    image:
      "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Marina Bay skyline in Singapore at dusk",
    linkLabel: enTranslations["hotelDestination.Singapore.linkLabel"],
  },
  {
    title: enTranslations["hotelDestination.Barcelona.title"],
    subtitle: enTranslations["hotelDestination.Barcelona.subtitle"],
    destinationQuery: "Barcelona",
    image:
      "https://images.unsplash.com/photo-1583422409516-2895a77efded?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Barcelona cityscape with Sagrada Familia in daylight",
    linkLabel: enTranslations["hotelDestination.Barcelona.linkLabel"],
  },
];

const globalHotelDestinationCards: HotelDestinationCard[] = [
  {
    title: enTranslations["hotelDestination.Toronto.title"],
    subtitle: enTranslations["hotelDestination.Toronto.subtitle"],
    destinationQuery: "Toronto",
    image:
      "https://images.unsplash.com/photo-1517090504586-fde19ea6066f?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Toronto skyline with the CN Tower beside Lake Ontario",
    linkLabel: enTranslations["hotelDestination.Toronto.linkLabel"],
  },
  {
    title: enTranslations["hotelDestination.Amsterdam.title"],
    subtitle: enTranslations["hotelDestination.Amsterdam.subtitle"],
    destinationQuery: "Amsterdam",
    image:
      "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Amsterdam canal houses and bridge along the water",
    linkLabel: enTranslations["hotelDestination.Amsterdam.linkLabel"],
  },
  {
    title: enTranslations["hotelDestination.Bangkok.title"],
    subtitle: enTranslations["hotelDestination.Bangkok.subtitle"],
    destinationQuery: "Bangkok",
    image:
      "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Bangkok city skyline and Chao Phraya river at sunset",
    linkLabel: enTranslations["hotelDestination.Bangkok.linkLabel"],
  },
  {
    title: enTranslations["hotelDestination.Cancun.title"],
    subtitle: enTranslations["hotelDestination.Cancun.subtitle"],
    destinationQuery: "Cancun",
    image:
      "https://images.unsplash.com/photo-1552074284-5e88ef1aef18?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Cancun beach with white sand and turquoise water",
    linkLabel: enTranslations["hotelDestination.Cancun.linkLabel"],
  },
  {
    title: enTranslations["hotelDestination.Istanbul.title"],
    subtitle: enTranslations["hotelDestination.Istanbul.subtitle"],
    destinationQuery: "Istanbul",
    image:
      "https://images.unsplash.com/photo-1527838832700-5059252407fa?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Istanbul waterfront with domes and minarets at golden hour",
    linkLabel: enTranslations["hotelDestination.Istanbul.linkLabel"],
  },
];

const hotelInspirationCategoryChips = [
  "Beach",
  "City breaks",
  "Family trips",
  "Relaxed stays",
  "Weekend ideas",
] as const;

type HotelInspirationCategory = (typeof hotelInspirationCategoryChips)[number];

type HotelInspirationCard = HotelDestinationCard & {
  badge: string;
  detail: string;
};

const destinationImageCatalog = [
  ...hotelDestinationCards,
  ...moreHotelDestinationCards,
  ...globalHotelDestinationCards,
];

const getDestinationCard = (destinationQuery: string) => {
  const card = destinationImageCatalog.find(
    (item) => item.destinationQuery === destinationQuery,
  );

  if (!card) {
    throw new Error(
      `Hotel inspiration category references unknown destination: ${destinationQuery}`,
    );
  }

  return card;
};

const createHotelInspirationCard = (
  destinationQuery: string,
  badge: string,
): HotelInspirationCard => {
  const card = getDestinationCard(destinationQuery);

  return {
    ...card,
    title: card.destinationQuery,
    subtitle: card.title,
    badge,
    detail: card.title,
  };
};

const hotelInspirationCardsByCategory: Record<
  HotelInspirationCategory,
  HotelInspirationCard[]
> = {
  Beach: [
    createHotelInspirationCard("Cancun", "Coastal stays"),
    createHotelInspirationCard("Barcelona", "City coast"),
    createHotelInspirationCard("Dubai", "Waterfront stays"),
    createHotelInspirationCard("Singapore", "Harbor city"),
    createHotelInspirationCard("Bangkok", "Warm escape"),
    createHotelInspirationCard("Tokyo", "Bay city"),
  ],
  "City breaks": [
    createHotelInspirationCard("London", "Capital stays"),
    createHotelInspirationCard("Paris", "Classic city"),
    createHotelInspirationCard("Toronto", "City ideas"),
    createHotelInspirationCard("Istanbul", "Culture stays"),
    createHotelInspirationCard("Rome", "Historic city"),
    createHotelInspirationCard("Amsterdam", "Canal stays"),
  ],
  "Family trips": [
    createHotelInspirationCard("Toronto", "Family city"),
    createHotelInspirationCard("Singapore", "Easy exploring"),
    createHotelInspirationCard("Cancun", "Beach time"),
    createHotelInspirationCard("London", "City exploring"),
    createHotelInspirationCard("Dubai", "Waterfront stays"),
    createHotelInspirationCard("Tokyo", "City adventure"),
  ],
  "Relaxed stays": [
    createHotelInspirationCard("Cancun", "Coastal stays"),
    createHotelInspirationCard("Dubai", "Waterfront stays"),
    createHotelInspirationCard("Singapore", "Harbor city"),
    createHotelInspirationCard("Amsterdam", "Canal stays"),
    createHotelInspirationCard("Bangkok", "Warm escape"),
    createHotelInspirationCard("Paris", "Slow city days"),
  ],
  "Weekend ideas": [
    createHotelInspirationCard("Rome", "Historic city"),
    createHotelInspirationCard("Amsterdam", "Canal stays"),
    createHotelInspirationCard("Barcelona", "City coast"),
    createHotelInspirationCard("Istanbul", "Culture stays"),
    createHotelInspirationCard("Paris", "Classic city"),
    createHotelInspirationCard("Toronto", "City ideas"),
  ],
};

type HotelDestinationLink = HotelDestinationCard & {
  href: string;
};

type DestinationCardProps = {
  card: HotelDestinationLink;
  imageSizes: string;
  isCompact?: boolean;
  isFeatured?: boolean;
};

function DestinationCard({
  card,
  imageSizes,
  isCompact = false,
  isFeatured = false,
}: DestinationCardProps) {
  return (
    <Link
      href={card.href}
      aria-label={card.linkLabel}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_28px_-26px_rgba(15,23,42,0.34)] transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_14px_30px_-26px_rgba(15,23,42,0.38)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/70 focus-visible:ring-offset-4 focus-visible:ring-offset-white"
    >
      <div
        className={`relative w-full overflow-hidden bg-slate-100 ${
          isFeatured
            ? "h-[18rem] sm:h-[20rem] md:h-[24rem] lg:h-[25rem]"
            : isCompact
              ? "aspect-[16/11]"
              : "aspect-[4/3]"
        }`}
      >
        <Image
          src={card.image}
          alt={card.imageAlt}
          fill
          sizes={imageSizes}
          className="object-cover saturate-[1.08] contrast-[1.02] transition duration-700 group-hover:scale-[1.03] group-hover:saturate-[1.12]"
        />
        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-slate-900/5" />
      </div>
      <div className={isCompact ? "p-3.5 sm:p-4" : "p-4 md:p-5"}>
        <p
          className={
            isCompact
              ? "text-base font-semibold leading-tight tracking-[-0.012em] text-slate-900 sm:text-lg"
              : "text-lg font-semibold leading-tight tracking-[-0.012em] text-slate-900 md:text-xl"
          }
        >
          {card.title}
        </p>
        <p
          className={
            isCompact
              ? "mt-1.5 text-xs font-medium leading-5 text-slate-600 sm:text-sm"
              : "mt-2 text-sm font-medium leading-5 text-slate-600"
          }
        >
          {card.subtitle}
        </p>
      </div>
    </Link>
  );
}

type InspirationCardProps = {
  card: HotelDestinationLink & Pick<HotelInspirationCard, "badge" | "detail">;
};

function InspirationCard({ card }: InspirationCardProps) {
  return (
    <Link
      href={card.href}
      aria-label={card.linkLabel}
      className="group flex h-full min-w-0 flex-col rounded-2xl bg-white p-2 transition duration-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/70 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-50 sm:p-2.5"
    >
      <div className="relative h-[6.75rem] w-full overflow-hidden rounded-xl bg-slate-100 sm:h-32 md:h-44 lg:h-48">
        <Image
          src={card.image}
          alt={card.imageAlt}
          fill
          sizes="(min-width: 1024px) 31vw, (min-width: 768px) 45vw, 42vw"
          className="object-cover saturate-[1.06] contrast-[1.02] transition duration-700 group-hover:scale-[1.03]"
        />
        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-slate-900/5" />
      </div>
      <div className="px-1 pb-1 pt-2.5 sm:pb-1.5 sm:pt-3">
        <span className="mb-1.5 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[0.68rem] font-semibold leading-5 text-slate-700 sm:mb-2 sm:px-2.5 sm:py-1 sm:text-xs">
          {card.badge}
        </span>
        <p className="text-[0.95rem] font-semibold leading-tight tracking-[-0.012em] text-slate-900 sm:text-base md:text-lg">
          {card.title}
        </p>
        <p className="mt-1 text-xs font-medium leading-5 text-slate-600 sm:mt-1.5 sm:text-sm">
          {card.detail}
        </p>
      </div>
    </Link>
  );
}

validateDestinationImages(
  "hotel destination cards",
  destinationImageCatalog.map((card) => ({
    id: card.destinationQuery,
    image: card.image,
  })),
);

hotelInspirationCategoryChips.forEach((category) => {
  validateDestinationImages(
    `hotel inspiration ${category} cards`,
    hotelInspirationCardsByCategory[category].map((card) => ({
      id: card.destinationQuery,
      image: card.image,
    })),
  );
});

export default function HotelsSearchPage() {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const translateHotelCard = <TCard extends HotelDestinationCard>(
    card: TCard,
  ) => ({
    ...card,
    title:
      dictionary[`hotelDestination.${card.destinationQuery}.title`] ??
      enTranslations[`hotelDestination.${card.destinationQuery}.title`] ??
      card.title,
    subtitle:
      dictionary[`hotelDestination.${card.destinationQuery}.subtitle`] ??
      enTranslations[`hotelDestination.${card.destinationQuery}.subtitle`] ??
      card.subtitle,
    linkLabel:
      dictionary[`hotelDestination.${card.destinationQuery}.linkLabel`] ??
      enTranslations[`hotelDestination.${card.destinationQuery}.linkLabel`] ??
      card.linkLabel,
  });
  const translateHotelInspirationCategory = (
    category: HotelInspirationCategory,
  ) =>
    dictionary[`hotelInspirationCategory.${category}`] ??
    enTranslations[`hotelInspirationCategory.${category}`] ??
    category;

  const translateHotelInspirationCard = (card: HotelInspirationCard) => ({
    ...translateHotelCard(card),
    badge:
      dictionary[`hotelInspirationBadge.${card.badge}`] ??
      enTranslations[`hotelInspirationBadge.${card.badge}`] ??
      card.badge,
    detail:
      dictionary[`hotelDestination.${card.destinationQuery}.detail`] ??
      enTranslations[`hotelDestination.${card.destinationQuery}.detail`] ??
      card.detail,
  });
  const [selectedInspirationCategory, setSelectedInspirationCategory] =
    useState<HotelInspirationCategory>("Beach");

  const destinationCardHref = useMemo(() => {
    const baseDate = new Date();
    const defaultCheckIn = addDays(baseDate, 21);
    const defaultCheckOut = addDays(baseDate, 24);

    return (destinationQuery: string) =>
      `/hotels/results?${new URLSearchParams({
        destination: destinationQuery,
        checkIn: defaultCheckIn,
        checkOut: defaultCheckOut,
        guests: "2",
        rooms: "1",
      }).toString()}`;
  }, []);

  const hotelDestinationLinks = hotelDestinationCards.map((card) => ({
    ...translateHotelCard(card),
    href: destinationCardHref(card.destinationQuery),
  }));

  const moreHotelDestinationLinks = moreHotelDestinationCards.map((card) => ({
    ...translateHotelCard(card),
    href: destinationCardHref(card.destinationQuery),
  }));

  const globalHotelDestinationLinks = globalHotelDestinationCards.map(
    (card) => ({
      ...translateHotelCard(card),
      href: destinationCardHref(card.destinationQuery),
    }),
  );

  const hotelInspirationLinks = hotelInspirationCardsByCategory[
    selectedInspirationCategory
  ].map((card) => ({
    ...translateHotelInspirationCard(card),
    href: destinationCardHref(card.destinationQuery),
  }));
  const hotelSearchIntroLabel = t("hotelSearchIntroLabel");

  return (
    <>
      <AppHeader />
      <main className="relative isolate flex-1 overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#f6f7fb_48%,#f8fafc_100%)] pb-16">
        <section className="relative isolate overflow-visible bg-slate-950">
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src={hotelsHeroImage}
              alt={hotelsHeroImageAlt}
              fill
              priority
              sizes="100vw"
              className="object-cover object-[50%_44%] brightness-[1.06] saturate-[1.06] sm:object-[50%_46%]"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950/48 via-slate-950/16 to-transparent" />
            <div className="absolute inset-y-0 left-0 w-[74%] bg-gradient-to-r from-slate-950/66 via-slate-950/28 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-slate-950/58 via-slate-950/18 to-transparent" />
          </div>

          <div className="page-shell relative z-10 flex min-h-[42rem] flex-col justify-center py-14 sm:min-h-[38rem] sm:py-16 lg:min-h-[40rem] lg:py-18">
            <div className="max-w-2xl text-white">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/75">
                {t("hotelsHeroEyebrow")}
              </p>
              <h1 className="mt-3 text-[2.35rem] font-semibold leading-[1.02] tracking-[-0.035em] text-white drop-shadow-[0_3px_18px_rgba(15,23,42,0.62)] sm:text-[3rem] lg:text-[3.6rem]">
                {t("hotelsHeroTitle")}
              </h1>
              <p className="mt-4 max-w-xl text-base font-semibold leading-7 text-white/90 drop-shadow-[0_2px_12px_rgba(15,23,42,0.62)] sm:text-lg">
                {t("hotelsHeroSubtitle")}
              </p>
            </div>

            <div className="mt-8 max-w-6xl sm:mt-10 lg:mt-12">
              <HotelSearchBar
                introLabel={hotelSearchIntroLabel}
                className="[&>p]:hidden [&>form]:!mt-0 [&>form>div]:!rounded-[1.75rem] [&>form>div]:!border-white/75 [&>form>div]:!bg-white/95 [&>form>div]:!p-2.5 [&>form>div]:!shadow-[0_30px_72px_-30px_rgba(15,23,42,0.62)] [&>form>div]:!ring-1 [&>form>div]:!ring-slate-950/[0.06] sm:[&>form>div]:!p-3 lg:[&>form>div]:!p-3.5"
              />
            </div>
          </div>
        </section>

        <div className="page-shell relative mx-auto mt-10 max-w-6xl space-y-11 sm:mt-12 md:mt-14 md:space-y-14 lg:mt-16">
          <section
            className="space-y-4"
            aria-labelledby="hotel-destinations-heading"
          >
            <h2
              id="hotel-destinations-heading"
              className="px-1 text-[1.35rem] font-semibold leading-[1.18] tracking-[-0.014em] text-slate-800 md:text-[2rem]"
            >
              {t("exploreHotelStaysByDestination")}
            </h2>
            <div className="border border-slate-200/80 bg-white/80 p-3 shadow-[0_16px_44px_-40px_rgba(15,23,42,0.28)] ring-1 ring-white/80 sm:p-6 md:p-7">
              <div className="grid auto-cols-[minmax(260px,86vw)] grid-flow-col gap-4 overflow-x-auto px-1 pb-3 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] md:grid-flow-row md:auto-cols-auto md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 md:pt-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
                {hotelDestinationLinks.map((card) => (
                  <DestinationCard
                    key={card.title}
                    card={card}
                    imageSizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 86vw"
                  />
                ))}
              </div>
            </div>
          </section>

          <section
            className="space-y-4"
            aria-labelledby="more-hotel-destinations-heading"
          >
            <h2
              id="more-hotel-destinations-heading"
              className="px-1 text-[1.2rem] font-semibold leading-[1.2] tracking-[-0.012em] text-slate-800 md:text-[1.85rem]"
            >
              {t("featuredHotelDestinations")}
            </h2>
            <div className="border border-slate-200/80 bg-slate-50/85 p-3 shadow-[0_16px_44px_-40px_rgba(15,23,42,0.26)] ring-1 ring-white/80 sm:p-6 md:p-7">
              <div className="grid auto-cols-[minmax(250px,84vw)] grid-flow-col gap-4 overflow-x-auto px-1 pb-3 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] md:grid-flow-row md:auto-cols-auto md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 md:pt-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
                {moreHotelDestinationLinks.map((card) => (
                  <DestinationCard
                    key={card.title}
                    card={card}
                    imageSizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 84vw"
                    isFeatured
                  />
                ))}
              </div>
            </div>
          </section>

          <section
            className="space-y-5"
            aria-labelledby="hotel-inspiration-heading"
          >
            <div className="border border-slate-200/80 bg-slate-50/90 p-3 shadow-[0_16px_44px_-40px_rgba(15,23,42,0.26)] ring-1 ring-white/80 sm:p-6 md:p-7">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="max-w-2xl">
                  <h2
                    id="hotel-inspiration-heading"
                    className="text-[1.2rem] font-semibold leading-[1.2] tracking-[-0.012em] text-slate-800 md:text-[1.85rem]"
                  >
                    {t("findStaysEveryKindTrip")}
                  </h2>
                  <p className="mt-1.5 max-w-xl text-[0.9rem] leading-5 text-slate-600 md:mt-2 md:text-base md:leading-6">
                    {t("hotelInspirationBody")}
                  </p>
                </div>
                <div
                  className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] md:flex-wrap md:justify-end md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden"
                  aria-label={t("hotelInspirationCategories")}
                >
                  {hotelInspirationCategoryChips.map((chip) => {
                    const isSelected = chip === selectedInspirationCategory;

                    return (
                      <button
                        key={chip}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedInspirationCategory(chip)}
                        className={`focus-ring whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        {translateHotelInspirationCategory(chip)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 overflow-x-auto px-1 pb-3 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] md:overflow-visible md:px-0 md:pb-0 md:pt-0 [&::-webkit-scrollbar]:hidden">
                <div className="grid auto-cols-[minmax(148px,42vw)] grid-flow-col grid-rows-2 gap-3 sm:auto-cols-[minmax(170px,34vw)] sm:gap-4 md:grid-flow-row md:auto-cols-auto md:grid-cols-3 md:grid-rows-none">
                  {hotelInspirationLinks.map((card) => (
                    <InspirationCard key={card.title} card={card} />
                  ))}
                </div>
              </div>
            </div>
          </section>
          <section className="relative isolate rounded-[1.5rem] border border-slate-200/75 bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(248,250,252,0.72)_54%,rgba(241,245,249,0.58))] p-2 shadow-[0_24px_64px_-52px_rgba(15,23,42,0.34)] ring-1 ring-white/80 sm:rounded-[2rem] sm:p-4">
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3">
              {[
                {
                  title: t("homeTrustCompareTitle"),
                  body: t("hotelTrustCompareBody"),
                  icon: Building2,
                },
                {
                  title: t("hotelTrustReviewTitle"),
                  body: t("hotelTrustReviewBody"),
                  icon: ClipboardCheck,
                },
                {
                  title: t("hotelTrustProviderTitle"),
                  body: t("hotelTrustProviderBody"),
                  icon: Calendar,
                },
              ].map((item, index) => {
                const Icon = item.icon;

                return (
                  <article
                    key={item.title}
                    className={`relative isolate cursor-default overflow-hidden rounded-[1rem] border border-slate-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.82),rgba(248,250,252,0.7)_58%,rgba(241,245,249,0.78))] p-2.5 shadow-[0_14px_34px_-32px_rgba(15,23,42,0.38)] ring-1 ring-white/70 backdrop-blur-sm sm:rounded-[1.5rem] sm:p-6 ${
                      index === 2 ? "col-span-2 md:col-span-1" : ""
                    }`}
                  >
                    <div className="pointer-events-none absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/80 to-transparent" />
                    <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-slate-200/30 blur-3xl" />
                    <div
                      className="relative mb-2.5 inline-flex h-8 w-8 items-center justify-center rounded-[0.8rem] border border-indigo-200/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(238,242,255,0.72)_52%,rgba(248,250,252,0.92))] text-indigo-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_22px_-18px_rgba(79,70,229,0.55),0_8px_18px_-20px_rgba(15,23,42,0.55)] sm:mb-5 sm:h-12 sm:w-12 sm:rounded-[1rem]"
                      aria-hidden="true"
                    >
                      <span className="pointer-events-none absolute inset-[3px] rounded-[0.62rem] border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.88)] sm:inset-1 sm:rounded-[0.78rem]" />
                      <span className="pointer-events-none absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_0_1px_rgba(129,140,248,0.18)] sm:left-2 sm:top-2 sm:h-2 sm:w-2" />
                      <span className="relative inline-flex h-5 w-5 items-center justify-center rounded-lg bg-white/45 ring-1 ring-indigo-100/70 sm:h-8 sm:w-8 sm:rounded-xl">
                        <Icon className="h-3.5 w-3.5 stroke-[1.8] sm:h-5 sm:w-5" />
                      </span>
                    </div>
                    <h2 className="relative text-[0.82rem] font-semibold leading-snug tracking-[-0.01em] text-slate-800 sm:text-base">
                      {item.title}
                    </h2>
                    <p className="relative mt-1.5 text-[0.75rem] leading-4 text-slate-700 sm:mt-2 sm:text-sm sm:leading-6">
                      {item.body}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>

          <section
            className="space-y-4"
            aria-labelledby="global-hotel-destinations-heading"
          >
            <h2
              id="global-hotel-destinations-heading"
              className="px-1 text-[1.2rem] font-semibold leading-[1.2] tracking-[-0.012em] text-slate-800 md:text-[1.85rem]"
            >
              {t("exploreStaysWorldwide")}
            </h2>
            <div className="border border-slate-200/80 bg-white/80 p-3 shadow-[0_16px_44px_-40px_rgba(15,23,42,0.26)] ring-1 ring-white/80 sm:p-6 md:p-7">
              <div className="grid auto-cols-[minmax(220px,76vw)] grid-flow-col gap-4 overflow-x-auto px-1 pb-3 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] md:grid-flow-row md:auto-cols-auto md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0 md:pt-0 lg:grid-cols-5 [&::-webkit-scrollbar]:hidden">
                {globalHotelDestinationLinks.map((card) => (
                  <DestinationCard
                    key={card.title}
                    card={card}
                    imageSizes="(min-width: 1024px) 20vw, (min-width: 768px) 33vw, 76vw"
                    isCompact
                  />
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
