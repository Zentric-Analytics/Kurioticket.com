import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import type { FlightSearchParams, NormalizedFlightResult } from "@/lib/types";
import {
  getDuffelGraphProviderOfferIds,
  pruneDuffelItineraryGraph,
  type DuffelItineraryInventoryGraph,
} from "./providers/duffelItineraryView";
import { buildDealsFlightSearchKeyFromPayload } from "@/lib/deals/dealsProductSearchKeys";
import {
  getDealsFlightFareChoicesV2,
  getDealsFlightOutboundChoicesV2,
  getDealsFlightReturnChoicesV2,
  resolveDealsFlightOfferV2,
} from "./dealsFlightInventoryV2";
import {
  isFlightProviderOfferUsableAt,
  isProviderBackedFlightOffer,
} from "./flightOfferInventory";
import {
  prismaDealsFlightInventoryStore,
  type DealsFlightInventoryStore,
} from "./dealsFlightInventorySessionStore";

const text = z.string();
const segment = z
  .object({
    originAirport: text,
    destinationAirport: text,
    departureTime: text,
    arrivalTime: text,
    airlineName: text.optional(),
    flightNumber: text.optional(),
  })
  .strict();
const layover = z
  .object({
    airport: text,
    duration: text,
    quality: z.enum(["short", "good", "long", "overnight", "unknown"]),
  })
  .strict();
const leg = z
  .object({
    direction: z.enum(["outbound", "return", "leg"]),
    originAirport: text,
    destinationAirport: text,
    departureTime: text,
    arrivalTime: text,
    duration: text,
    durationMinutes: z.number(),
    stops: z.number(),
    layovers: z.array(layover),
    segments: z.array(segment),
  })
  .strict();
const offerSchema = z
  .object({
    id: text,
    provider: text,
    airlineName: text,
    airlineLogo: text.optional(),
    flightNumber: text.optional(),
    originAirport: text,
    destinationAirport: text,
    departureTime: text,
    arrivalTime: text,
    duration: text,
    durationMinutes: z.number(),
    stops: z.number(),
    layovers: z.array(layover),
    legs: z.array(leg).optional(),
    cabinClass: text,
    baggageInfo: text,
    refundInfo: text,
    price: z.number().finite(),
    currency: text,
    bookingUrl: text,
    partnerRedirectUrl: text,
    valueScore: z.number(),
    riskScore: z.number(),
    comfortScore: z.number(),
    travelConfidenceScore: z.number(),
    travelEffortScore: z.number(),
    recommendationReasons: z.array(text),
    badges: z.array(text),
    providerOfferId: text.min(1),
    providerExpiresAt: z.number().finite().optional(),
  })
  .strict();
const inventorySchema = z.array(offerSchema);
const airlineSchema = z
  .object({
    referenceId: text.min(1),
    name: text.min(1),
    iataCode: text.optional(),
  })
  .strict();
const graphSchema = z
  .object({
    offerRequestId: text.min(1),
    slices: z
      .array(
        z
          .object({
            index: z.number().int().nonnegative(),
            origin: text.min(1),
            destination: text.min(1),
            itineraries: z
              .array(
                z
                  .object({
                    itineraryKey: text.min(1),
                    segments: z
                      .array(
                        z
                          .object({
                            origin: text.min(1),
                            destination: text.min(1),
                            departure: text.min(1),
                            arrival: text.min(1),
                            marketingCarrier: airlineSchema,
                            operatingCarrier: airlineSchema,
                            flightNumber: text.min(1),
                            aircraft: z
                              .object({
                                referenceId: text.min(1),
                                name: text.min(1),
                                iataCode: text.min(1),
                              })
                              .strict()
                              .optional(),
                          })
                          .strict(),
                      )
                      .min(1),
                    brands: z
                      .array(
                        z
                          .object({
                            serverBrandIdentity: text.min(1),
                            fareBrandName: text.min(1),
                            cabinClass: text.optional(),
                            fareBasisCode: text.optional(),
                            compatibleSingleTicketOffers: z
                              .array(
                                z
                                  .object({
                                    providerOfferId: text.min(1),
                                    owner: airlineSchema,
                                    amount: text.regex(/^\d+(?:\.\d+)?$/),
                                    currency: text.min(1),
                                  })
                                  .strict(),
                              )
                              .min(1),
                            indicativeFrom: z
                              .object({
                                amount: text.regex(/^\d+(?:\.\d+)?$/),
                                currency: text.min(1),
                              })
                              .strict()
                              .optional(),
                          })
                          .strict(),
                      )
                      .min(1),
                  })
                  .strict(),
              )
              .min(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();
const inventoryV2Schema = z
  .object({ exactOffers: inventorySchema, itineraryGraph: graphSchema })
  .strict();
const searchSchema = z
  .object({
    tripType: z.enum(["round-trip", "one-way"]),
    origin: text,
    destination: text,
    departureDate: text,
    returnDate: text.optional(),
    adults: z.number().int(),
    children: z.number().int(),
    infants: z.number().int(),
    travelers: z.number().int(),
    cabinClass: z.enum(["economy", "premium-economy", "business", "first"]),
    sort: z.enum(["cheapest", "best", "fastest", "stops"]).optional(),
    currency: text.optional(),
  })
  .strict();

export type InventoryFailure =
  | "unknown-inventory"
  | "inventory-expired"
  | "stale-search"
  | "malformed-inventory";
export class DealsFlightInventoryError extends Error {
  constructor(public code: InventoryFailure) {
    super(code);
  }
}
export const hashInventoryToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const usable = (offers: NormalizedFlightResult[], now: number) =>
  offers.filter((offer) => isFlightProviderOfferUsableAt(offer, now));
const isCompleteForSearch = (
  offer: NormalizedFlightResult,
  search: FlightSearchParams,
) => {
  const outbound = offer.legs?.some((leg) => leg.direction === "outbound");
  const inbound = offer.legs?.some((leg) => leg.direction === "return");
  return Boolean(
    outbound && (search.tripType === "one-way" ? !inbound : inbound),
  );
};
const withoutRawProviderReference = (offer: NormalizedFlightResult) => {
  const canonical = { ...offer };
  delete canonical.rawProviderReference;
  return canonical;
};

export class DealsFlightInventorySessionService {
  constructor(
    private store: DealsFlightInventoryStore = prismaDealsFlightInventoryStore,
    private now: () => number = Date.now,
  ) {}
  async create(
    search: FlightSearchParams,
    results: NormalizedFlightResult[],
    itineraryGraph: DuffelItineraryInventoryGraph,
  ) {
    const now = this.now();
    const offers = results
      .filter(
        (offer) =>
          isProviderBackedFlightOffer(offer) &&
          isFlightProviderOfferUsableAt(offer, now) &&
          isCompleteForSearch(offer, search),
      )
      .map(withoutRawProviderReference);
    if (!offers.length) return null;
    const prunedGraph = pruneDuffelItineraryGraph(
      itineraryGraph,
      new Set(offers.map(({ providerOfferId }) => providerOfferId!)),
    );
    if (!prunedGraph) return null;
    const finite = offers.flatMap((offer) =>
      offer.providerExpiresAt === undefined ? [] : [offer.providerExpiresAt],
    );
    const expiresAt = new Date(
      Math.min(
        now + 30 * 60_000,
        finite.length === offers.length ? Math.max(...finite) : Infinity,
      ),
    );
    const inventoryPayload = inventoryV2Schema.parse({
      exactOffers: offers,
      itineraryGraph: prunedGraph,
    });
    const searchPayload = searchSchema.parse(search);
    const inventoryToken = randomBytes(32).toString("base64url");
    const sourceSearchKey = buildDealsFlightSearchKeyFromPayload(search);
    await this.store.deleteExpired(new Date(now), 100);
    await this.store.create({
      tokenHash: hashInventoryToken(inventoryToken),
      schemaVersion: 2,
      sourceSearchKey,
      searchPayload,
      inventoryPayload,
      expiresAt,
      createdAt: new Date(now),
    });
    return {
      inventoryToken,
      sourceSearchKey,
      inventoryExpiresAt: expiresAt.toISOString(),
      outboundChoices: getDealsFlightOutboundChoicesV2(offers),
    };
  }
  async load(token: string, expected: string) {
    const row = await this.store.find(hashInventoryToken(token));
    if (!row) throw new DealsFlightInventoryError("unknown-inventory");
    if (row.expiresAt.getTime() <= this.now()) {
      await this.store.delete(row.tokenHash);
      throw new DealsFlightInventoryError("inventory-expired");
    }
    if (row.sourceSearchKey !== expected)
      throw new DealsFlightInventoryError("stale-search");
    const search = searchSchema.safeParse(row.searchPayload);
    if (!search.success)
      throw new DealsFlightInventoryError("malformed-inventory");
    if (row.schemaVersion === 1) {
      const parsed = inventorySchema.safeParse(row.inventoryPayload);
      if (!parsed.success)
        throw new DealsFlightInventoryError("malformed-inventory");
      return {
        offers: parsed.data as NormalizedFlightResult[],
        search: search.data as FlightSearchParams,
      };
    }
    if (row.schemaVersion === 2) {
      const parsed = inventoryV2Schema.safeParse(row.inventoryPayload);
      if (!parsed.success)
        throw new DealsFlightInventoryError("malformed-inventory");
      const exactOffers = parsed.data.exactOffers as NormalizedFlightResult[];
      const graph = parsed.data.itineraryGraph as DuffelItineraryInventoryGraph;
      if (
        exactOffers.some(
          (offer) =>
            offer.provider !== "Duffel" || !isProviderBackedFlightOffer(offer),
        )
      )
        throw new DealsFlightInventoryError("malformed-inventory");
      const exactIds = new Set(
        exactOffers.map((offer) => offer.providerOfferId!),
      );
      const graphIds = getDuffelGraphProviderOfferIds(graph);
      const expectedSlices = search.data.tripType === "one-way" ? 1 : 2;
      const code = (value: string) => value.trim().toUpperCase();
      const expectedRoutes =
        search.data.tripType === "one-way"
          ? [[search.data.origin, search.data.destination]]
          : [
              [search.data.origin, search.data.destination],
              [search.data.destination, search.data.origin],
            ];
      if (
        exactIds.size !== graphIds.size ||
        [...exactIds].some((id) => !graphIds.has(id)) ||
        graph.slices.length !== expectedSlices ||
        graph.slices.some(
          (slice, index) =>
            slice.index !== index ||
            code(slice.origin) !== code(expectedRoutes[index][0]) ||
            code(slice.destination) !== code(expectedRoutes[index][1]),
        )
      )
        throw new DealsFlightInventoryError("malformed-inventory");
      return {
        offers: exactOffers,
        search: search.data as FlightSearchParams,
        itineraryGraph: graph,
      };
    }
    throw new DealsFlightInventoryError("malformed-inventory");
  }
  async fareBrands(token: string, key: string, outbound: string) {
    const loaded = await this.load(token, key);
    if (!loaded.itineraryGraph || loaded.search.tripType !== "round-trip")
      return [];
    const { getDealsFlightFareBrandOptionsV2 } =
      await import("./dealsFlightFareBrandInventoryV2");
    return getDealsFlightFareBrandOptionsV2(
      usable(loaded.offers, this.now()),
      loaded.itineraryGraph,
      hashInventoryToken(token),
      outbound,
    );
  }
  async brandReturns(
    token: string,
    key: string,
    outbound: string,
    brand: string,
  ) {
    const loaded = await this.load(token, key);
    if (!loaded.itineraryGraph || loaded.search.tripType !== "round-trip")
      return [];
    const { getDealsFlightBrandReturnChoicesV2 } =
      await import("./dealsFlightFareBrandInventoryV2");
    return getDealsFlightBrandReturnChoicesV2(
      usable(loaded.offers, this.now()),
      loaded.itineraryGraph,
      hashInventoryToken(token),
      outbound,
      brand,
    );
  }
  async brandFares(
    token: string,
    key: string,
    outbound: string,
    brand: string,
    inbound: string,
  ) {
    const loaded = await this.load(token, key);
    if (!loaded.itineraryGraph || loaded.search.tripType !== "round-trip")
      return [];
    const { getDealsFlightBrandFareChoicesV2 } =
      await import("./dealsFlightFareBrandInventoryV2");
    return getDealsFlightBrandFareChoicesV2(
      usable(loaded.offers, this.now()),
      loaded.itineraryGraph,
      hashInventoryToken(token),
      outbound,
      brand,
      inbound,
    );
  }
  async returns(token: string, key: string, outbound: string) {
    const loaded = await this.load(token, key);
    if (loaded.itineraryGraph && loaded.search.tripType === "round-trip")
      return [];
    const { offers } = loaded;
    return getDealsFlightReturnChoicesV2(usable(offers, this.now()), outbound);
  }
  async fares(token: string, key: string, outbound: string, inbound?: string) {
    const loaded = await this.load(token, key);
    if (loaded.itineraryGraph && loaded.search.tripType === "round-trip")
      return [];
    const { offers } = loaded;
    return getDealsFlightFareChoicesV2(
      usable(offers, this.now()),
      outbound,
      inbound,
    );
  }
  async resolve(
    token: string,
    key: string,
    outbound: string,
    inbound: string | undefined,
    fare: string,
  ) {
    const loaded = await this.load(token, key);
    if (loaded.itineraryGraph && loaded.search.tripType === "round-trip")
      return { ...loaded, offer: null };
    return {
      ...loaded,
      offer: resolveDealsFlightOfferV2(loaded.offers, outbound, inbound, fare),
    };
  }
  async resolveBrandFare(
    token: string,
    key: string,
    outbound: string,
    brand: string,
    inbound: string,
    fare: string,
  ) {
    const loaded = await this.load(token, key);
    if (!loaded.itineraryGraph || loaded.search.tripType !== "round-trip")
      return { ...loaded, offer: null };
    const { resolveDealsFlightBrandOfferV2 } =
      await import("./dealsFlightFareBrandInventoryV2");
    return {
      ...loaded,
      offer: resolveDealsFlightBrandOfferV2(
        loaded.offers,
        loaded.itineraryGraph,
        hashInventoryToken(token),
        outbound,
        brand,
        inbound,
        fare,
      ),
    };
  }
}

export const dealsFlightInventorySessions =
  new DealsFlightInventorySessionService();
