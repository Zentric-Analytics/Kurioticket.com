import type { DestinationDetail, DestinationSlug } from "./destinationModel";

export const destinationHref = (slug: DestinationSlug) => ({ pathname: "/destination/[slug]" as const, params: { slug } });
export const flightsHref = (destination: Pick<DestinationDetail, "name">) => ({ pathname: "/flights" as const, params: { destination: destination.name } });
export const priceAlertsHref = (destination: Pick<DestinationDetail, "name">) => ({ pathname: "/price-alerts" as const, params: { destination: destination.name } });
