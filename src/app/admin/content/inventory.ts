import { faqItemKeys } from "@/content/faqs";
import { carsFaqItems, pickupCards } from "@/data/carsLandingContent";
import {
  getDefaultHomeDiscoveryPriceRoutes,
  getGlobalHomeDiscoveryPriceRoutes,
  getHomeDiscoveryRouteAllowlist,
} from "@/data/homeDiscovery";
import { homepageTrustMessages } from "@/data/homepageTrustMessages";
import { hotelDestinations } from "@/data/hotelDestinations";
import { popularDestinationsByMarket } from "@/data/marketHomeContent";

export type ContentInventoryMetric = {
  label: string;
  value: number;
  unit: string;
};

export type ContentInventoryResult = {
  title: string;
  primaryCount: number;
  unit: string;
  supportingMetrics: ContentInventoryMetric[];
  sourceType: "Code-backed";
  publicState: "Public" | "Configured";
  note: string;
  href?: string;
};

const uniqueCount = <Item,>(items: Item[], selector: (item: Item) => string) =>
  new Set(items.map(selector)).size;

export function getContentInventory(): ContentInventoryResult[] {
  const homepageAssignments = Object.values(popularDestinationsByMarket).flat();
  const defaultFlightRoutes = getDefaultHomeDiscoveryPriceRoutes();
  const globalFlightRoutes = getGlobalHomeDiscoveryPriceRoutes();
  const generalFaqCount = faqItemKeys.length;
  const carsFaqCount = carsFaqItems.length;

  return [
    {
      title: "Homepage destination content",
      primaryCount: uniqueCount(homepageAssignments, (item) => item.id),
      unit: "unique card IDs",
      supportingMetrics: [
        { label: "Configured market assignments", value: homepageAssignments.length, unit: "assignments" },
        {
          label: "Unique origin/destination routes",
          value: uniqueCount(homepageAssignments, (item) => `${item.originCode}:${item.code}`),
          unit: "routes",
        },
      ],
      sourceType: "Code-backed",
      publicState: "Public",
      note: "Market-specific homepage destination configuration; assignments can share card IDs or routes.",
      href: "/admin/content/homepage-destinations",
    },
    {
      title: "Configured flight fare routes",
      primaryCount: getHomeDiscoveryRouteAllowlist().size,
      unit: "total configured route IDs",
      supportingMetrics: [
        { label: "Default-US routes", value: defaultFlightRoutes.length, unit: "routes" },
        { label: "Global routes", value: globalFlightRoutes.length, unit: "routes" },
      ],
      sourceType: "Code-backed",
      publicState: "Configured",
      note: "Configured fare-route IDs across default, regional, and global homepage sources.",
      href: "/admin/content/flight-routes",
    },
    {
      title: "Hotel search destinations",
      primaryCount: hotelDestinations.length,
      unit: "search destinations",
      supportingMetrics: [],
      sourceType: "Code-backed",
      publicState: "Public",
      note: "Search and autocomplete destinations; these are not homepage destination cards.",
      href: "/admin/content/hotel-destinations",
    },
    {
      title: "Car pickup cards",
      primaryCount: pickupCards.length,
      unit: "pickup cards",
      supportingMetrics: [],
      sourceType: "Code-backed",
      publicState: "Public",
      note: "Public pickup-location cards on the Cars landing page.",
      href: "/admin/content/car-pickup-cards",
    },
    {
      title: "FAQ definitions",
      primaryCount: generalFaqCount + carsFaqCount,
      unit: "total definitions",
      supportingMetrics: [
        { label: "General/support FAQs", value: generalFaqCount, unit: "definitions" },
        { label: "Cars FAQs", value: carsFaqCount, unit: "definitions" },
      ],
      sourceType: "Code-backed",
      publicState: "Public",
      note: "Definition counts only; public FAQ output is localized at runtime.",
      href: "/admin/content/faqs",
    },
    {
      title: "Homepage trust messages",
      primaryCount: homepageTrustMessages.length,
      unit: "trust messages",
      supportingMetrics: [],
      sourceType: "Code-backed",
      publicState: "Public",
      note: "Localized, code-backed messages on the public homepage; other trust-content surfaces are not included.",
      href: "/admin/content/homepage-trust-messages",
    },
  ];
}
