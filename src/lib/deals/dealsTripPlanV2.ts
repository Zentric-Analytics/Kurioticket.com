import type { DealsTripPlanCar, DealsTripPlanHotel } from "./dealsTripPlan";
import {
  buildDealsSearchFingerprint,
  DEALS_TRIP_PLAN_TTL_MS,
} from "./dealsTripPlan";
import {
  dealsPackageModes,
  getIncludedProducts,
  type DealsCabinClass,
  type DealsFlightTripType,
  type DealsPackageMode,
  type DealsSearch,
} from "./dealsSearchParams";
import {
  buildDealsProductSearchKeys,
  type DealsProductSearchKeys,
} from "./dealsProductSearchKeys";

export const DEALS_TRIP_PLAN_V2_VERSION = 2 as const;
export type DealsFlightPhaseV2 =
  | "outbound"
  | "return"
  | "fare"
  | "revalidating"
  | "confirmed";
export type DealsFlightSegmentV2 = {
  originAirport: string;
  destinationAirport: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
};
export type DealsFlightItineraryV2 = {
  itineraryKey: string;
  direction: "outbound" | "return";
  originAirport: string;
  destinationAirport: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  durationMinutes: number;
  stops: number;
  layovers: string[];
  segments: DealsFlightSegmentV2[];
};
export type DealsFlightFareV2 = {
  fareKey: string;
  brand?: string;
  cabinClass: DealsCabinClass;
  baggageInfo?: string;
  refundInfo?: string;
};
export type DealsConfirmedFlightOfferV2 = {
  resultId: string;
  provider: string;
  providerOfferId: string;
  airline: string;
  flightNumber?: string;
  outboundItineraryKey: string;
  returnItineraryKey?: string;
  fareKey?: string;
  legs: DealsFlightItineraryV2[];
  cabinClass: DealsCabinClass;
  baggageInfo?: string;
  refundInfo?: string;
  sourcePrice: number;
  sourceCurrency: string;
  providerExpiresAt: number;
  selectedAt: number;
  validatedAt: number;
};
export type DealsFlightJourneyV2 = {
  searchKey: string;
  tripType: DealsFlightTripType;
  phase: DealsFlightPhaseV2;
  outbound?: DealsFlightItineraryV2;
  return?: DealsFlightItineraryV2;
  fare?: DealsFlightFareV2;
  confirmedOffer?: DealsConfirmedFlightOfferV2;
};
export type DealsTripPlanV2 = {
  version: 2;
  mode: DealsPackageMode;
  searchFingerprint: string;
  productSearchKeys: DealsProductSearchKeys;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  revision: number;
  hotel?: DealsTripPlanHotel;
  car?: DealsTripPlanCar;
  flightJourney?: DealsFlightJourneyV2;
  opened: { hotel?: number; flight?: number; car?: number };
};

export const createDealsFlightJourneyV2 = (
  searchKey: string,
  tripType: DealsFlightTripType,
): DealsFlightJourneyV2 => ({ searchKey, tripType, phase: "outbound" });
export function createDealsTripPlanV2(
  search: DealsSearch,
  now = Date.now(),
): DealsTripPlanV2 {
  const productSearchKeys = buildDealsProductSearchKeys(search);
  return {
    version: 2,
    mode: search.mode,
    searchFingerprint: buildDealsSearchFingerprint(search),
    productSearchKeys,
    createdAt: now,
    updatedAt: now,
    expiresAt: now + DEALS_TRIP_PLAN_TTL_MS,
    revision: 0,
    ...(getIncludedProducts(search.mode).flight
      ? {
          flightJourney: createDealsFlightJourneyV2(
            productSearchKeys.flight,
            search.flightTripType,
          ),
        }
      : {}),
    opened: {},
  };
}

const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : null;
const time = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;
const uint = (v: unknown): v is number =>
  Number.isInteger(v) && (v as number) >= 0;
const price = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v > 0;
const cabin = (v: unknown): v is DealsCabinClass =>
  v === "economy" || v === "business" || v === "first";
function itinerary(
  v: unknown,
  direction?: "outbound" | "return",
): DealsFlightItineraryV2 | null {
  if (
    !record(v) ||
    (v.direction !== "outbound" && v.direction !== "return") ||
    (direction && v.direction !== direction) ||
    !uint(v.durationMinutes) ||
    !uint(v.stops) ||
    !Array.isArray(v.layovers) ||
    !v.layovers.every((x) => typeof x === "string") ||
    !Array.isArray(v.segments)
  )
    return null;
  const fields = [
    "itineraryKey",
    "originAirport",
    "destinationAirport",
    "departureTime",
    "arrivalTime",
    "duration",
  ] as const;
  if (fields.some((k) => !text(v[k]))) return null;
  const segments = v.segments.map((s) => {
    if (!record(s) || !uint(s.durationMinutes)) return null;
    const a = text(s.originAirport),
      b = text(s.destinationAirport),
      c = text(s.departureTime),
      d = text(s.arrivalTime);
    return a && b && c && d
      ? {
          originAirport: a,
          destinationAirport: b,
          departureTime: c,
          arrivalTime: d,
          durationMinutes: s.durationMinutes as number,
        }
      : null;
  });
  if (!segments.length || segments.some((x) => !x)) return null;
  return {
    itineraryKey: text(v.itineraryKey)!,
    direction: v.direction,
    originAirport: text(v.originAirport)!,
    destinationAirport: text(v.destinationAirport)!,
    departureTime: text(v.departureTime)!,
    arrivalTime: text(v.arrivalTime)!,
    duration: text(v.duration)!,
    durationMinutes: v.durationMinutes,
    stops: v.stops,
    layovers: [...v.layovers],
    segments: segments as DealsFlightSegmentV2[],
  };
}
function selection<T extends "hotel" | "car">(
  v: unknown,
  kind: T,
): DealsTripPlanV2[T] | null {
  if (!record(v) || !price(v.sourcePrice) || !time(v.resultReceivedAt))
    return null;
  const required =
    kind === "hotel"
      ? [
          "id",
          "provider",
          "name",
          "location",
          "checkIn",
          "checkOut",
          "sourceCurrency",
        ]
      : [
          "id",
          "provider",
          "rentalCompany",
          "modelName",
          "categoryLabel",
          "pickupLocation",
          "returnLocation",
          "pickupDate",
          "pickupTime",
          "dropoffDate",
          "dropoffTime",
          "sourceCurrency",
          "detailsPath",
        ];
  if (required.some((k) => !text(v[k]))) return null;
  const allowed =
    kind === "hotel"
      ? [
          ...required,
          "roomType",
          "sourcePrice",
          "resultReceivedAt",
          "detailsPath",
        ]
      : [...required, "sourcePrice", "resultReceivedAt"];
  return Object.fromEntries(
    allowed
      .filter((k) => v[k] !== undefined)
      .map((k) => [k, typeof v[k] === "string" ? text(v[k]) : v[k]]),
  ) as DealsTripPlanV2[T];
}
function flight(v: unknown): DealsFlightJourneyV2 | null {
  if (
    !record(v) ||
    !text(v.searchKey) ||
    !["one-way", "round-trip"].includes(v.tripType as string) ||
    !["outbound", "return", "fare", "revalidating", "confirmed"].includes(
      v.phase as string,
    )
  )
    return null;
  const outbound =
      v.outbound === undefined ? undefined : itinerary(v.outbound, "outbound"),
    ret = v.return === undefined ? undefined : itinerary(v.return, "return");
  if (outbound === null || ret === null) return null;
  let fare: DealsFlightFareV2 | undefined;
  if (v.fare !== undefined) {
    if (!record(v.fare) || !text(v.fare.fareKey) || !cabin(v.fare.cabinClass))
      return null;
    fare = {
      fareKey: text(v.fare.fareKey)!,
      cabinClass: v.fare.cabinClass,
      ...(text(v.fare.brand) ? { brand: text(v.fare.brand)! } : {}),
      ...(text(v.fare.baggageInfo)
        ? { baggageInfo: text(v.fare.baggageInfo)! }
        : {}),
      ...(text(v.fare.refundInfo)
        ? { refundInfo: text(v.fare.refundInfo)! }
        : {}),
    };
  }
  let confirmedOffer: DealsConfirmedFlightOfferV2 | undefined;
  if (v.confirmedOffer !== undefined) {
    const o = v.confirmedOffer;
    if (
      !record(o) ||
      ![
        "resultId",
        "provider",
        "providerOfferId",
        "airline",
        "outboundItineraryKey",
        "sourceCurrency",
      ].every((k) => text(o[k])) ||
      !cabin(o.cabinClass) ||
      !price(o.sourcePrice) ||
      !time(o.providerExpiresAt) ||
      !time(o.selectedAt) ||
      !time(o.validatedAt) ||
      !Array.isArray(o.legs)
    )
      return null;
    const legs = o.legs.map((x) => itinerary(x));
    if (!legs.length || legs.some((x) => !x)) return null;
    confirmedOffer = {
      resultId: text(o.resultId)!,
      provider: text(o.provider)!,
      providerOfferId: text(o.providerOfferId)!,
      airline: text(o.airline)!,
      outboundItineraryKey: text(o.outboundItineraryKey)!,
      legs: legs as DealsFlightItineraryV2[],
      cabinClass: o.cabinClass,
      sourcePrice: o.sourcePrice,
      sourceCurrency: text(o.sourceCurrency)!,
      providerExpiresAt: o.providerExpiresAt,
      selectedAt: o.selectedAt,
      validatedAt: o.validatedAt,
      ...(text(o.returnItineraryKey)
        ? { returnItineraryKey: text(o.returnItineraryKey)! }
        : {}),
      ...(text(o.fareKey) ? { fareKey: text(o.fareKey)! } : {}),
    };
  }
  const tripType = v.tripType as DealsFlightTripType,
    phase = v.phase as DealsFlightPhaseV2;
  if (
    (phase !== "outbound" && !outbound) ||
    (tripType === "round-trip" &&
      ["fare", "revalidating", "confirmed"].includes(phase) &&
      !ret) ||
    (tripType === "one-way" && ret) ||
    (phase === "confirmed" && !confirmedOffer) ||
    (phase !== "confirmed" && confirmedOffer)
  )
    return null;
  return {
    searchKey: text(v.searchKey)!,
    tripType,
    phase,
    ...(outbound ? { outbound } : {}),
    ...(ret ? { return: ret } : {}),
    ...(fare ? { fare } : {}),
    ...(confirmedOffer ? { confirmedOffer } : {}),
  };
}
export function canonicalizeDealsTripPlanV2(
  v: unknown,
): DealsTripPlanV2 | null {
  if (
    !record(v) ||
    v.version !== 2 ||
    !dealsPackageModes.includes(v.mode as never) ||
    !text(v.searchFingerprint) ||
    !time(v.createdAt) ||
    !time(v.updatedAt) ||
    !time(v.expiresAt) ||
    !uint(v.revision) ||
    !record(v.opened)
  )
    return null;
  const rawProductSearchKeys = v.productSearchKeys;
  if (
    !record(rawProductSearchKeys) ||
    !["hotel", "flight", "car"].every((k) => text(rawProductSearchKeys[k]))
  )
    return null;
  if (
    v.updatedAt < v.createdAt ||
    v.expiresAt <= v.createdAt ||
    v.expiresAt > v.createdAt + DEALS_TRIP_PLAN_TTL_MS
  )
    return null;
  const included = getIncludedProducts(v.mode as DealsPackageMode),
    hotel = v.hotel === undefined ? undefined : selection(v.hotel, "hotel"),
    car = v.car === undefined ? undefined : selection(v.car, "car"),
    fj = v.flightJourney === undefined ? undefined : flight(v.flightJourney);
  if (
    hotel === null ||
    car === null ||
    fj === null ||
    (!included.hotel && hotel) ||
    (!included.car && car) ||
    included.flight !== Boolean(fj)
  )
    return null;
  const keys = {
    hotel: text(rawProductSearchKeys.hotel)!,
    flight: text(rawProductSearchKeys.flight)!,
    car: text(rawProductSearchKeys.car)!,
  };
  if (fj && fj.searchKey !== keys.flight) return null;
  return {
    version: 2,
    mode: v.mode as DealsPackageMode,
    searchFingerprint: text(v.searchFingerprint)!,
    productSearchKeys: keys,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
    expiresAt: v.expiresAt,
    revision: v.revision,
    ...(hotel ? { hotel } : {}),
    ...(car ? { car } : {}),
    ...(fj ? { flightJourney: fj } : {}),
    opened: {},
  };
}
export const parseDealsTripPlanV2 = (
  raw: string | null,
): DealsTripPlanV2 | null => {
  if (raw === null) return null;
  try {
    return canonicalizeDealsTripPlanV2(JSON.parse(raw));
  } catch {
    return null;
  }
};
export const serializeDealsTripPlanV2 = (plan: DealsTripPlanV2): string => {
  const value = canonicalizeDealsTripPlanV2(plan);
  if (!value) throw new TypeError("Invalid Deals trip plan v2");
  return JSON.stringify(value);
};
