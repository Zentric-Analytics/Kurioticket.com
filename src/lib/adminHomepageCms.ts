import type { CmsContentType } from "@/generated/prisma/enums";
import { getCmsMarketName } from "@/lib/adminCmsMarketLabels";

export const homepageCmsSections = {
  destinations: {
    type: "HOMEPAGE_DESTINATION" as CmsContentType,
    title: "Homepage destinations",
    singular: "Homepage destination",
  },
  "flight-routes": {
    type: "FLIGHT_ROUTE" as CmsContentType,
    title: "Flight route cards",
    singular: "Flight route",
  },
  "hotel-destinations": {
    type: "HOTEL_DESTINATION" as CmsContentType,
    title: "Hotel destinations",
    singular: "Hotel destination",
  },
} as const;

export type HomepageCmsSection = keyof typeof homepageCmsSections;

export function getHomepageCmsSection(value: string) {
  return value in homepageCmsSections
    ? value as HomepageCmsSection
    : null;
}

/**
 * Order a CMS directory for admins without mutating or publishing its records.
 * Across all markets, keep each market together alphabetically by its visible
 * label. Within one market, smaller draft Order values appear first.
 */
export function sortHomepageCmsDirectoryItems<T extends {
  market: string;
  sortOrder: number;
  key: string;
}>(items: readonly T[]): T[] {
  return [...items].sort((left, right) =>
    getCmsMarketName(left.market).localeCompare(getCmsMarketName(right.market)) ||
    left.market.localeCompare(right.market) ||
    left.sortOrder - right.sortOrder ||
    left.key.localeCompare(right.key)
  );
}
