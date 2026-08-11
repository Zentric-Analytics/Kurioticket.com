import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import type { FlightSearchParams, NormalizedFlightResult } from "@/lib/types";
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
  async create(search: FlightSearchParams, results: NormalizedFlightResult[]) {
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
    const finite = offers.flatMap((offer) =>
      offer.providerExpiresAt === undefined ? [] : [offer.providerExpiresAt],
    );
    const expiresAt = new Date(
      Math.min(
        now + 30 * 60_000,
        finite.length === offers.length ? Math.max(...finite) : Infinity,
      ),
    );
    const inventoryPayload = inventorySchema.parse(offers);
    const searchPayload = searchSchema.parse(search);
    const inventoryToken = randomBytes(32).toString("base64url");
    const sourceSearchKey = buildDealsFlightSearchKeyFromPayload(search);
    await this.store.deleteExpired(new Date(now), 100);
    await this.store.create({
      tokenHash: hashInventoryToken(inventoryToken),
      schemaVersion: 1,
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
    const parsed = inventorySchema.safeParse(row.inventoryPayload);
    const search = searchSchema.safeParse(row.searchPayload);
    if (row.schemaVersion !== 1 || !parsed.success || !search.success)
      throw new DealsFlightInventoryError("malformed-inventory");
    return {
      offers: parsed.data as NormalizedFlightResult[],
      search: search.data as FlightSearchParams,
    };
  }
  async returns(token: string, key: string, outbound: string) {
    const { offers } = await this.load(token, key);
    return getDealsFlightReturnChoicesV2(usable(offers, this.now()), outbound);
  }
  async fares(token: string, key: string, outbound: string, inbound?: string) {
    const { offers } = await this.load(token, key);
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
    return {
      ...loaded,
      offer: resolveDealsFlightOfferV2(loaded.offers, outbound, inbound, fare),
    };
  }
}

export const dealsFlightInventorySessions =
  new DealsFlightInventorySessionService();
