import { getCarPickupCardSummary } from "./car-pickup-cards/page-data";
import { getFaqInventorySummary } from "./faqs/page-data";
import { getFlightRouteInventorySummary } from "./flight-routes/page-data";
import { getHomepageDestinationSummary } from "./homepage-destinations/page-data";
import { getHomepageTrustMessageSummary } from "./homepage-trust-messages/page-data";
import { getHotelDestinationSummary } from "./hotel-destinations/page-data";

export type ContentInventoryCategoryId =
  | "homepage-destinations"
  | "flight-routes"
  | "hotel-destinations"
  | "car-pickup-cards"
  | "faqs"
  | "homepage-trust-messages";

export const contentInventoryRoutes = {
  "homepage-destinations": "/admin/content/homepage-destinations",
  "flight-routes": "/admin/content/flight-routes",
  "hotel-destinations": "/admin/content/hotel-destinations",
  "car-pickup-cards": "/admin/content/car-pickup-cards",
  "faqs": "/admin/content/faqs",
  "homepage-trust-messages": "/admin/content/homepage-trust-messages",
} as const satisfies Record<ContentInventoryCategoryId, `/admin/content/${string}`>;

export type ContentInventoryMetric = { label: string; value: number; unit: string };

export type ContentInventoryResult = {
  id: ContentInventoryCategoryId;
  title: string;
  primaryCount: number;
  unit: string;
  supportingMetrics: ContentInventoryMetric[];
  sourceType: "Code-backed";
  publicState: "Public" | "Configured";
  note: string;
  href: (typeof contentInventoryRoutes)[ContentInventoryCategoryId];
};

export function getContentInventory(): ContentInventoryResult[] {
  const homepage = getHomepageDestinationSummary();
  const flights = getFlightRouteInventorySummary();
  const hotels = getHotelDestinationSummary();
  const cars = getCarPickupCardSummary();
  const faqs = getFaqInventorySummary();
  const trustMessages = getHomepageTrustMessageSummary();

  return [
    {
      id: "homepage-destinations", title: "Homepage destination content",
      primaryCount: homepage.uniqueCardIds, unit: "unique card IDs",
      supportingMetrics: [
        { label: "Configured market assignments", value: homepage.marketAssignments, unit: "assignments" },
        { label: "Unique origin/destination routes", value: homepage.uniqueRoutes, unit: "routes" },
      ],
      sourceType: "Code-backed", publicState: "Public",
      note: "Market-specific homepage destination configuration; assignments can share card IDs or routes.",
      href: contentInventoryRoutes["homepage-destinations"],
    },
    {
      id: "flight-routes", title: "Configured flight fare routes",
      primaryCount: flights.uniqueRouteIds, unit: "Unique route IDs",
      supportingMetrics: [
        { label: "Pool memberships", value: flights.poolMemberships, unit: "memberships" },
        { label: "Default-US routes", value: flights.defaultUsRoutes, unit: "routes" },
        { label: "Global routes", value: flights.globalRoutes, unit: "routes" },
      ],
      sourceType: "Code-backed", publicState: "Configured",
      note: "One route ID can appear in more than one regional, global, backup or fallback pool.",
      href: contentInventoryRoutes["flight-routes"],
    },
    {
      id: "hotel-destinations", title: "Hotel search destinations",
      primaryCount: hotels.total, unit: "search destinations", supportingMetrics: [],
      sourceType: "Code-backed", publicState: "Public",
      note: "Search and autocomplete destinations; these are not homepage destination cards.",
      href: contentInventoryRoutes["hotel-destinations"],
    },
    {
      id: "car-pickup-cards", title: "Car pickup cards",
      primaryCount: cars.pickupCards, unit: "pickup cards", supportingMetrics: [],
      sourceType: "Code-backed", publicState: "Public",
      note: "Public pickup-location cards on the Cars landing page.",
      href: contentInventoryRoutes["car-pickup-cards"],
    },
    {
      id: "faqs", title: "FAQ definitions",
      primaryCount: faqs.total, unit: "total definitions",
      supportingMetrics: [
        { label: "General/support FAQs", value: faqs.generalAndSupport, unit: "definitions" },
        { label: "Cars FAQs", value: faqs.cars, unit: "definitions" },
      ],
      sourceType: "Code-backed", publicState: "Public",
      note: "Definition counts only; public FAQ output is localized at runtime.",
      href: contentInventoryRoutes.faqs,
    },
    {
      id: "homepage-trust-messages", title: "Homepage trust messages",
      primaryCount: trustMessages.messages, unit: "trust messages", supportingMetrics: [],
      sourceType: "Code-backed", publicState: "Public",
      note: "Localized, code-backed messages on the public homepage; other trust-content surfaces are not included.",
      href: contentInventoryRoutes["homepage-trust-messages"],
    },
  ];
}

export function getContentInventoryCategory(id: ContentInventoryCategoryId) {
  const category = getContentInventory().find((item) => item.id === id);
  if (!category) throw new Error(`Content Inventory category is unavailable: ${id}`);
  return category;
}
