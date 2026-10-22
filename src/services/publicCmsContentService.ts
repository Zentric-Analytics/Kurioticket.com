import { getGeneralFaqs, type FaqItem } from "@/content/faqs";
import { getTranslations } from "@/lib/i18n";
import { normalizeLanguage } from "@/lib/language";
import { getHomeDiscoveryByRegion } from "@/data/homeDiscovery";
import { hotelDestinations } from "@/data/hotelDestinations";
import { getPopularDestinationsByRegion } from "@/data/marketHomeContent";
import { readPublishedCmsContent } from "@/services/cmsContentService";

export type CmsHomepageDestination = {
  id: string;
  city: string;
  country: string;
  countryCode?: string;
  destinationCode: string;
  originCode: string;
  image: string;
  imageAlt: string;
};

export type CmsFlightRoute = {
  id: string;
  title: string;
  originCity: string;
  originCode: string;
  destinationCity: string;
  destinationCode: string;
  routeNote: string;
  image: string;
  imageAlt: string;
};

export type CmsHotelDestination = {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  kind: "city" | "district" | "landmark" | "airport-area" | "custom";
  searchValue: string;
  canonicalId?: string;
  image?: string;
  imageAlt?: string;
};

export type CmsFaq = FaqItem & { id: string; category: string };

export async function getPublishedHomepageDestinations(market: string) {
  const fallback = getPopularDestinationsByRegion(market);
  return readPublishedCmsContent<CmsHomepageDestination>("HOMEPAGE_DESTINATION", {
    market: fallback.effectiveMarketCode,
    locale: "en",
    fallback: () => fallback.items.map((item) => ({
      id: item.id,
      city: item.city,
      country: item.country,
      destinationCode: item.code,
      originCode: item.originCode,
      image: item.image,
      imageAlt: item.imageAlt,
    })),
  });
}

export async function getPublishedFlightRoutes() {
  return readPublishedCmsContent<CmsFlightRoute>("FLIGHT_ROUTE", {
    market: "GLOBAL",
    locale: "en",
    fallback: () => getHomeDiscoveryByRegion("US").map((item) => ({
      id: item.id,
      title: item.title,
      originCity: item.originCity,
      originCode: item.originCode,
      destinationCity: item.destinationCity,
      destinationCode: item.destinationCode,
      routeNote: item.routeNote,
      image: item.image,
      imageAlt: item.imageAlt,
    })),
  });
}

export async function getPublishedHotelDestinations() {
  return readPublishedCmsContent<CmsHotelDestination>("HOTEL_DESTINATION", {
    market: "GLOBAL",
    locale: "en",
    fallback: () => hotelDestinations.map((item) => ({
      id: item.id,
      name: item.name,
      country: item.country,
      countryCode: item.countryCode,
      kind: item.kind,
      searchValue: item.searchValue,
      canonicalId: item.canonical?.id,
    })),
  });
}

export async function getPublishedFaqs(localeInput?: string | null) {
  const locale = normalizeLanguage(localeInput);
  const cmsLocale = locale.startsWith("en-") ? "en" : locale;
  const dictionary = getTranslations(locale);
  return readPublishedCmsContent<CmsFaq>("FAQ", {
    market: "GLOBAL",
    locale: cmsLocale,
    fallback: () => getGeneralFaqs((key) => dictionary[key] ?? key).map((item, index) => ({
      id: `fallback-faq-${index + 1}`,
      question: item.question,
      answer: item.answer,
      category: "General",
    })),
  });
}
