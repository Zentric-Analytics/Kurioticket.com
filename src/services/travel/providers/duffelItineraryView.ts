import { createHash } from "node:crypto";

/**
 * Server-side representation of Duffel's compact `view=itineraries` response.
 * It deliberately is not a NormalizedFlightResult: nested offers are only priced
 * projections and do not contain the slices needed by that normalizer.
 */
export type DuffelItineraryInventoryGraph = {
  offerRequestId: string;
  slices: DuffelInventorySlice[];
};

export type DuffelInventorySlice = {
  index: number;
  origin: string;
  destination: string;
  itineraries: DuffelInventoryItinerary[];
};

export type DuffelInventoryItinerary = {
  itineraryKey: string;
  segments: DuffelInventorySegment[];
  brands: DuffelInventoryBrand[];
};

export type DuffelInventorySegment = {
  origin: string;
  destination: string;
  departure: string;
  arrival: string;
  marketingCarrier: ResolvedDuffelAirline;
  operatingCarrier: ResolvedDuffelAirline;
  flightNumber: string;
  aircraft?: ResolvedDuffelAircraft;
};

export type ResolvedDuffelAirline = {
  /** Provider identity retained only inside the server-side inventory graph. */
  referenceId: string;
  name: string;
  iataCode?: string;
};

export type ResolvedDuffelAircraft = {
  /** Provider identity retained only inside the server-side inventory graph. */
  referenceId: string;
  name: string;
  iataCode: string;
};

export type DuffelInventoryBrand = {
  /** Internal node identity, never a client-authored brand name. */
  serverBrandIdentity: string;
  fareBrandName: string;
  cabinClass?: string;
  fareBasisCode?: string;
  compatibleSingleTicketOffers: DuffelPricedOffer[];
  indicativeFrom?: { amount: string; currency: string };
};

export type DuffelPricedOffer = {
  /** A provider identity. Keep the graph and values containing it on the server. */
  providerOfferId: string;
  owner: ResolvedDuffelAirline;
  amount: string;
  currency: string;
};

type UnknownRecord = Record<string, unknown>;

const record = (value: unknown): UnknownRecord | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;

const requiredString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const optionalString = (value: unknown) => requiredString(value) ?? undefined;

type DuffelReferences = {
  airlines: UnknownRecord;
  places: UnknownRecord;
  aircraft: UnknownRecord;
};

function referenceMap(value: unknown) {
  const map = record(value);
  if (!map || Object.values(map).some((entry) => !record(entry))) return null;
  return map;
}

function parseReferences(value: unknown): DuffelReferences | null {
  const references = record(value);
  if (!references) return null;
  const airlines = referenceMap(references.airlines);
  const places = referenceMap(references.places);
  const aircraft = referenceMap(references.aircraft);
  return airlines && places && aircraft ? { airlines, places, aircraft } : null;
}

const iataCode = (value: unknown) => {
  const code = requiredString(value)?.toUpperCase();
  return code && /^[A-Z]{3}$/.test(code) ? code : null;
};

const airlineCode = (value: unknown) => {
  const code = requiredString(value)?.toUpperCase();
  return code && /^[A-Z0-9]{2}$/.test(code) ? code : null;
};

const aircraftCode = (value: unknown) => {
  const code = requiredString(value)?.toUpperCase();
  return code && /^[A-Z0-9]{3}$/.test(code) ? code : null;
};

function referencedCode(
  value: unknown,
  references: UnknownRecord,
  parseCode: (value: unknown) => string | null,
) {
  const referenceId = requiredString(value);
  if (!referenceId) return null;
  const entity = record(references[referenceId]);
  return entity ? parseCode(entity.iata_code) : null;
}

function resolvedAirline(
  value: unknown,
  references: UnknownRecord,
): ResolvedDuffelAirline | null {
  const referenceId = requiredString(value);
  if (!referenceId) return null;
  const entity = record(references[referenceId]);
  const name = requiredString(entity?.name);
  if (!entity || !name) return null;

  // Duffel explicitly permits null (and older payloads may omit the field), but
  // a supplied value must remain a real two-character airline IATA code.
  const rawIataCode = entity.iata_code;
  if (rawIataCode !== null && rawIataCode !== undefined) {
    const parsedIataCode = airlineCode(rawIataCode);
    if (!parsedIataCode) return null;
    return { referenceId, name, iataCode: parsedIataCode };
  }
  return { referenceId, name };
}

function resolvedAircraft(
  value: unknown,
  references: UnknownRecord,
): ResolvedDuffelAircraft | null {
  const referenceId = requiredString(value);
  if (!referenceId) return null;
  const entity = record(references[referenceId]);
  const name = requiredString(entity?.name);
  const parsedIataCode = aircraftCode(entity?.iata_code);
  return entity && name && parsedIataCode
    ? { referenceId, name, iataCode: parsedIataCode }
    : null;
}

const canonical = (value: string) => value.trim().toUpperCase();

function carrierMaterialIdentity(carrier: ResolvedDuffelAirline) {
  if (carrier.iataCode) return `iata:${canonical(carrier.iataCode)}`;

  // Non-IATA airline names are useful display fallbacks, but names alone cannot
  // prove that two Duffel airline entities are equivalent. Hash the reference to
  // retain that distinction without placing raw arl_* material in a browser key.
  const opaqueReference = createHash("sha256")
    .update(carrier.referenceId)
    .digest("base64url");
  return `non-iata:${canonical(carrier.name)}:${opaqueReference}`;
}

function ownerMaterialIdentity(owner: ResolvedDuffelAirline) {
  return carrierMaterialIdentity(owner);
}

/** Builds a browser-safe identity from physical flight sequence, never price or offer ID. */
export function buildDuffelItineraryKey(
  direction: "outbound" | "return",
  origin: string,
  destination: string,
  segments: DuffelInventorySegment[],
) {
  const materialIdentity = JSON.stringify([
    "duffel-itinerary-v1",
    direction,
    canonical(origin),
    canonical(destination),
    segments.map((segment) => [
      canonical(segment.origin),
      canonical(segment.destination),
      segment.departure,
      segment.arrival,
      carrierMaterialIdentity(segment.marketingCarrier),
      carrierMaterialIdentity(segment.operatingCarrier),
      canonical(segment.flightNumber),
    ]),
  ]);
  return `duffel-itinerary-v1:${createHash("sha256").update(materialIdentity).digest("base64url")}`;
}

function parseSegment(
  value: unknown,
  references: DuffelReferences,
): DuffelInventorySegment | null {
  const segment = record(value);
  if (!segment) return null;
  const aircraft =
    segment.aircraft === null || segment.aircraft === undefined
      ? undefined
      : resolvedAircraft(segment.aircraft, references.aircraft);
  if (aircraft === null) return null;
  const parsed = {
    origin: referencedCode(segment.origin, references.places, iataCode),
    destination: referencedCode(
      segment.destination,
      references.places,
      iataCode,
    ),
    departure: requiredString(segment.departing_at),
    arrival: requiredString(segment.arriving_at),
    marketingCarrier: resolvedAirline(
      segment.marketing_carrier,
      references.airlines,
    ),
    operatingCarrier: resolvedAirline(
      segment.operating_carrier,
      references.airlines,
    ),
    flightNumber: requiredString(segment.marketing_carrier_flight_number),
    aircraft,
  };
  if (Object.values(parsed).some((field) => field === null)) return null;
  return parsed as DuffelInventorySegment;
}

function parseOffer(
  value: unknown,
  references: DuffelReferences,
): DuffelPricedOffer | null {
  const offer = record(value);
  if (!offer || offer.type !== "single_ticket") return null;
  const parsed = {
    providerOfferId: requiredString(offer.id),
    owner: resolvedAirline(offer.owner, references.airlines),
    amount: requiredString(offer.total_amount),
    currency: requiredString(offer.total_currency)?.toUpperCase() ?? null,
  };
  if (Object.values(parsed).some((field) => field === null)) return null;
  if (!/^\d+(?:\.\d+)?$/.test(parsed.amount!)) return null;
  return parsed as DuffelPricedOffer;
}

function indicativeFrom(offers: DuffelPricedOffer[]) {
  const currencies = new Set(offers.map(({ currency }) => currency));
  if (!offers.length || currencies.size !== 1) return undefined;
  let minimum = offers[0];
  for (const offer of offers.slice(1)) {
    if (Number(offer.amount) < Number(minimum.amount)) minimum = offer;
  }
  return { amount: minimum.amount, currency: minimum.currency };
}

function brandIdentity(parts: unknown[]) {
  return `duffel-brand-node-v1:${createHash("sha256").update(JSON.stringify(parts)).digest("base64url")}`;
}

/**
 * Parses only Stage 4.5 identity and compatibility fields. A malformed root,
 * slice, itinerary, segment, or brand fails the response closed. Malformed and
 * split-ticket priced projections are excluded rather than inferred.
 */
export function parseDuffelItineraryView(
  response: unknown,
): DuffelItineraryInventoryGraph | null {
  const envelope = record(response);
  const data = record(envelope?.data);
  const offerRequestId = requiredString(data?.id);
  const references = parseReferences(data?.references);
  if (
    !data ||
    !offerRequestId ||
    !references ||
    !Array.isArray(data.slices) ||
    !data.slices.length
  )
    return null;

  const provisional: DuffelItineraryInventoryGraph = {
    offerRequestId,
    slices: [],
  };
  for (const [sliceIndex, rawSlice] of data.slices.entries()) {
    const slice = record(rawSlice);
    const origin = referencedCode(slice?.origin, references.places, iataCode);
    const destination = referencedCode(
      slice?.destination,
      references.places,
      iataCode,
    );
    if (!slice || !origin || !destination || !Array.isArray(slice.itineraries))
      return null;
    const direction = sliceIndex === 0 ? "outbound" : "return";
    const itineraries: DuffelInventoryItinerary[] = [];
    for (const rawItinerary of slice.itineraries) {
      const itinerary = record(rawItinerary);
      if (
        !itinerary ||
        !Array.isArray(itinerary.segments) ||
        !itinerary.segments.length ||
        !Array.isArray(itinerary.brands)
      )
        return null;
      const segments = itinerary.segments.map((segment) =>
        parseSegment(segment, references),
      );
      if (segments.some((segment) => segment === null)) return null;
      const parsedSegments = segments as DuffelInventorySegment[];
      const itineraryKey = buildDuffelItineraryKey(
        direction,
        origin,
        destination,
        parsedSegments,
      );
      const brands: DuffelInventoryBrand[] = [];
      for (const [brandIndex, rawBrand] of itinerary.brands.entries()) {
        const brand = record(rawBrand);
        if (brand?.fare_brand_name === null) continue;
        const fareBrandName = requiredString(brand?.fare_brand_name);
        if (!brand || !fareBrandName || !Array.isArray(brand.offers))
          return null;
        const offers = brand.offers
          .map((offer) => parseOffer(offer, references))
          .filter((offer): offer is DuffelPricedOffer => offer !== null);
        const cabinClass = optionalString(brand.cabin_class);
        const fareBasisCode = optionalString(brand.fare_basis_code);
        const identity = brandIdentity([
          sliceIndex,
          itineraryKey,
          brandIndex,
          fareBrandName,
          cabinClass,
          fareBasisCode,
          offers
            .map(({ providerOfferId, owner }) => [
              ownerMaterialIdentity(owner),
              providerOfferId,
            ])
            .sort(),
        ]);
        brands.push({
          serverBrandIdentity: identity,
          fareBrandName,
          cabinClass,
          fareBasisCode,
          compatibleSingleTicketOffers: offers,
          indicativeFrom: indicativeFrom(offers),
        });
      }
      itineraries.push({ itineraryKey, segments: parsedSegments, brands });
    }
    provisional.slices.push({
      index: sliceIndex,
      origin,
      destination,
      itineraries,
    });
  }

  // A multi-slice single ticket is complete only when the same offer identity
  // participates in every requested slice. Never manufacture an association.
  if (provisional.slices.length > 1) {
    const membership = provisional.slices.map(
      (slice) =>
        new Set(
          slice.itineraries.flatMap((itinerary) =>
            itinerary.brands.flatMap((brand) =>
              brand.compatibleSingleTicketOffers.map(
                (offer) => offer.providerOfferId,
              ),
            ),
          ),
        ),
    );
    const complete = new Set(
      [...membership[0]].filter((id) => membership.every((ids) => ids.has(id))),
    );
    for (const slice of provisional.slices) {
      for (const itinerary of slice.itineraries) {
        for (const brand of itinerary.brands) {
          brand.compatibleSingleTicketOffers =
            brand.compatibleSingleTicketOffers.filter(({ providerOfferId }) =>
              complete.has(providerOfferId),
            );
          brand.indicativeFrom = indicativeFrom(
            brand.compatibleSingleTicketOffers,
          );
        }
      }
    }
  }
  // Bind the internal node identity to the retained, complete membership set.
  // The array position keeps two otherwise-identical documented nodes distinct.
  for (const slice of provisional.slices) {
    for (const itinerary of slice.itineraries) {
      for (const [brandIndex, brand] of itinerary.brands.entries()) {
        brand.serverBrandIdentity = brandIdentity([
          slice.index,
          itinerary.itineraryKey,
          brandIndex,
          brand.fareBrandName,
          brand.cabinClass,
          brand.fareBasisCode,
          brand.compatibleSingleTicketOffers
            .map(({ providerOfferId, owner }) => [
              ownerMaterialIdentity(owner),
              providerOfferId,
            ])
            .sort(),
        ]);
      }
    }
  }
  return provisional;
}

export function getDuffelOutboundItineraryOptions(
  graph: DuffelItineraryInventoryGraph,
) {
  return graph.slices[0]?.itineraries ?? [];
}

export function getDuffelFareBrandOptionsForOutbound(
  graph: DuffelItineraryInventoryGraph,
  outboundItineraryKey: string,
) {
  return (
    graph.slices[0]?.itineraries.find(
      ({ itineraryKey }) => itineraryKey === outboundItineraryKey,
    )?.brands ?? []
  );
}

function selectedOutboundBrand(
  graph: DuffelItineraryInventoryGraph,
  outboundItineraryKey: string,
  serverBrandIdentity: string,
) {
  return getDuffelFareBrandOptionsForOutbound(graph, outboundItineraryKey).find(
    (brand) => brand.serverBrandIdentity === serverBrandIdentity,
  );
}

export function getCompatibleDuffelReturnItineraries(
  graph: DuffelItineraryInventoryGraph,
  outboundItineraryKey: string,
  serverBrandIdentity: string,
) {
  const brand = selectedOutboundBrand(
    graph,
    outboundItineraryKey,
    serverBrandIdentity,
  );
  if (!brand) return [];
  const selectedIds = new Set(
    brand.compatibleSingleTicketOffers.map(
      ({ providerOfferId }) => providerOfferId,
    ),
  );
  return (graph.slices[1]?.itineraries ?? []).filter((itinerary) =>
    itinerary.brands.some((returnBrand) =>
      returnBrand.compatibleSingleTicketOffers.some(({ providerOfferId }) =>
        selectedIds.has(providerOfferId),
      ),
    ),
  );
}

export function getCompatibleDuffelExactOfferIds(
  graph: DuffelItineraryInventoryGraph,
  outboundItineraryKey: string,
  serverBrandIdentity: string,
  returnItineraryKey: string,
) {
  const brand = selectedOutboundBrand(
    graph,
    outboundItineraryKey,
    serverBrandIdentity,
  );
  const returnItinerary = graph.slices[1]?.itineraries.find(
    ({ itineraryKey }) => itineraryKey === returnItineraryKey,
  );
  if (!brand || !returnItinerary) return [];
  const returnIds = new Set(
    returnItinerary.brands.flatMap((returnBrand) =>
      returnBrand.compatibleSingleTicketOffers.map(
        ({ providerOfferId }) => providerOfferId,
      ),
    ),
  );
  return brand.compatibleSingleTicketOffers
    .map(({ providerOfferId }) => providerOfferId)
    .filter((id) => returnIds.has(id));
}

/** Removes every relationship not backed by a usable exact offer. Empty nodes are removed. */
export function pruneDuffelItineraryGraph(
  graph: DuffelItineraryInventoryGraph,
  usableProviderOfferIds: ReadonlySet<string>,
): DuffelItineraryInventoryGraph | null {
  const slices = graph.slices
    .map((slice) => ({
      ...slice,
      itineraries: slice.itineraries
        .map((itinerary) => ({
          ...itinerary,
          brands: itinerary.brands
            .map((brand) => {
              const compatibleSingleTicketOffers =
                brand.compatibleSingleTicketOffers.filter(
                  ({ providerOfferId }) =>
                    usableProviderOfferIds.has(providerOfferId),
                );
              return {
                ...brand,
                compatibleSingleTicketOffers,
                indicativeFrom: indicativeFrom(compatibleSingleTicketOffers),
              };
            })
            .filter((brand) => brand.compatibleSingleTicketOffers.length > 0),
        }))
        .filter((itinerary) => itinerary.brands.length > 0),
    }))
    .filter((slice) => slice.itineraries.length > 0);
  if (slices.length !== graph.slices.length || !slices.length) return null;
  return { ...graph, slices };
}

export function getDuffelGraphProviderOfferIds(
  graph: DuffelItineraryInventoryGraph,
) {
  return new Set(
    graph.slices.flatMap((slice) =>
      slice.itineraries.flatMap((itinerary) =>
        itinerary.brands.flatMap((brand) =>
          brand.compatibleSingleTicketOffers.map(
            ({ providerOfferId }) => providerOfferId,
          ),
        ),
      ),
    ),
  );
}
