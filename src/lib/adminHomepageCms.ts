import type { CmsContentType } from "@/generated/prisma/enums";

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
