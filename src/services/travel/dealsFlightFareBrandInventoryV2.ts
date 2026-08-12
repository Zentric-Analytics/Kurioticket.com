import { createHash } from "node:crypto";
import type { DealsCabinClass } from "@/lib/deals/dealsSearchParams";
import type { NormalizedFlightResult } from "@/lib/types";
import type {
  DuffelInventoryBrand,
  DuffelItineraryInventoryGraph,
} from "./providers/duffelItineraryView";
import { buildFlightItineraryKey } from "./flightOfferInventory";
import {
  getDealsFlightFareChoicesV2,
  getDealsFlightReturnChoicesV2,
  resolveDealsFlightOfferV2,
} from "./dealsFlightInventoryV2";

export type DealsFlightFareBrandOptionV2 = {
  brandOptionKey: string;
  fareBrandName: string;
  cabinClass?: DealsCabinClass;
  ownerNames: string[];
  indicativeFromPrice?: number;
  indicativeCurrency?: string;
};

const isDealsCabinClass = (value: unknown): value is DealsCabinClass =>
  value === "economy" || value === "business" || value === "first";

const keyFor = (session: string, outbound: string, identity: string) =>
  `flight-brand-v1:${createHash("sha256")
    .update(JSON.stringify([session, outbound, identity]))
    .digest("base64url")}`;

function resolvedBrands(
  offers: NormalizedFlightResult[],
  graph: DuffelItineraryInventoryGraph,
  session: string,
  outbound: string,
) {
  const outboundOffers = offers.filter((offer) => {
    const leg = offer.legs?.find(({ direction }) => direction === "outbound");
    return leg && buildFlightItineraryKey(leg) === outbound;
  });
  const outboundIds = new Set(
    outboundOffers.map((offer) => offer.providerOfferId),
  );
  return graph.slices[0].itineraries.flatMap((itinerary) =>
    itinerary.brands.flatMap((brand) => {
      const memberships = brand.compatibleSingleTicketOffers.filter(
        ({ providerOfferId }) => outboundIds.has(providerOfferId),
      );
      if (!memberships.length) return [];
      const ids = new Set(
        memberships.map(({ providerOfferId }) => providerOfferId),
      );
      return [
        {
          brand,
          ids,
          key: keyFor(session, outbound, brand.serverBrandIdentity),
        },
      ];
    }),
  );
}

function option(
  node: { brand: DuffelInventoryBrand; ids: Set<string>; key: string },
  offers: NormalizedFlightResult[],
): DealsFlightFareBrandOptionV2 {
  const supporting = offers.filter((offer) =>
    node.ids.has(offer.providerOfferId!),
  );
  const currencies = new Set(supporting.map(({ currency }) => currency));
  const price =
    currencies.size === 1
      ? Math.min(...supporting.map(({ price }) => price))
      : undefined;
  const cabin = node.brand.cabinClass;
  return {
    brandOptionKey: node.key,
    fareBrandName: node.brand.fareBrandName,
    ...(isDealsCabinClass(cabin) ? { cabinClass: cabin } : {}),
    ownerNames: [
      ...new Set(
        node.brand.compatibleSingleTicketOffers
          .filter(({ providerOfferId }) => node.ids.has(providerOfferId))
          .map(({ owner }) => owner.name),
      ),
    ],
    ...(price === undefined
      ? {}
      : {
          indicativeFromPrice: price,
          indicativeCurrency: supporting[0].currency,
        }),
  };
}

export function getDealsFlightFareBrandOptionsV2(
  offers: NormalizedFlightResult[],
  graph: DuffelItineraryInventoryGraph,
  session: string,
  outbound: string,
) {
  return resolvedBrands(offers, graph, session, outbound).map((node) =>
    option(node, offers),
  );
}

function selectedOffers(
  offers: NormalizedFlightResult[],
  graph: DuffelItineraryInventoryGraph,
  session: string,
  outbound: string,
  brandKey: string,
) {
  const matches = resolvedBrands(offers, graph, session, outbound).filter(
    ({ key }) => key === brandKey,
  );
  if (matches.length !== 1) return [];
  return offers.filter((offer) => {
    const leg = offer.legs?.find(({ direction }) => direction === "outbound");
    return (
      leg &&
      buildFlightItineraryKey(leg) === outbound &&
      matches[0].ids.has(offer.providerOfferId!)
    );
  });
}

/** Resolves against the persisted authority set, including an offer that expired after selection. */
export function resolveDealsFlightBrandOfferV2(
  offers: NormalizedFlightResult[],
  graph: DuffelItineraryInventoryGraph,
  session: string,
  outbound: string,
  brandKey: string,
  inbound: string,
  fareKey: string,
) {
  return resolveDealsFlightOfferV2(
    selectedOffers(offers, graph, session, outbound, brandKey),
    outbound,
    inbound,
    fareKey,
  );
}

export function getDealsFlightBrandReturnChoicesV2(
  offers: NormalizedFlightResult[],
  graph: DuffelItineraryInventoryGraph,
  session: string,
  outbound: string,
  brandKey: string,
) {
  return getDealsFlightReturnChoicesV2(
    selectedOffers(offers, graph, session, outbound, brandKey),
    outbound,
  );
}

export function getDealsFlightBrandFareChoicesV2(
  offers: NormalizedFlightResult[],
  graph: DuffelItineraryInventoryGraph,
  session: string,
  outbound: string,
  brandKey: string,
  inbound: string,
) {
  return getDealsFlightFareChoicesV2(
    selectedOffers(offers, graph, session, outbound, brandKey),
    outbound,
    inbound,
  );
}
