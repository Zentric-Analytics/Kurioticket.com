import type { FlightSegment, Layover } from "@/lib/types";
import {
  dealsPackageModes,
  getIncludedProducts,
  type DealsCabinClass,
  type DealsFlightTripType,
  type DealsPackageMode,
  type DealsSearch,
} from "./dealsSearchParams";
import {
  buildDealsSearchFingerprint,
  DEALS_TRIP_PLAN_TTL_MS,
  validateDealsCarDetailsPath,
  validateDealsProductDetailsPath,
  type DealsTripPlanCar,
  type DealsTripPlanHotel,
} from "./dealsTripPlan";
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
export type DealsFlightDirectionV2 = "outbound" | "return";
export type DealsFlightItineraryV2 = {
  itineraryKey: string;
  direction: DealsFlightDirectionV2;
  originAirport: string;
  destinationAirport: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  durationMinutes: number;
  stops: number;
  layovers: Layover[];
  segments: FlightSegment[];
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
  fareKey: string;
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

const record = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));
const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;
const optionalText = (value: unknown): string | undefined | null =>
  value === undefined ? undefined : text(value);
const timestamp = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
const positive = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;
const nonNegativeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;
const cabin = (value: unknown): value is DealsCabinClass =>
  value === "economy" || value === "business" || value === "first";

const canonicalLayover = (value: unknown): Layover | null => {
  if (!record(value)) return null;
  const airport = text(value.airport),
    duration = text(value.duration);
  const quality = value.quality;
  if (
    !airport ||
    !duration ||
    !["short", "good", "long", "overnight", "unknown"].includes(String(quality))
  )
    return null;
  return { airport, duration, quality: quality as Layover["quality"] };
};
const canonicalSegment = (value: unknown): FlightSegment | null => {
  if (!record(value)) return null;
  const originAirport = text(value.originAirport),
    destinationAirport = text(value.destinationAirport);
  const departureTime = text(value.departureTime),
    arrivalTime = text(value.arrivalTime);
  const airlineName = optionalText(value.airlineName),
    flightNumber = optionalText(value.flightNumber);
  if (
    !originAirport ||
    !destinationAirport ||
    !departureTime ||
    !arrivalTime ||
    airlineName === null ||
    flightNumber === null
  )
    return null;
  return {
    originAirport,
    destinationAirport,
    departureTime,
    arrivalTime,
    ...(airlineName ? { airlineName } : {}),
    ...(flightNumber ? { flightNumber } : {}),
  };
};
export function canonicalizeDealsFlightItineraryV2(
  value: unknown,
): DealsFlightItineraryV2 | null {
  if (
    !record(value) ||
    !nonNegativeInteger(value.durationMinutes) ||
    !nonNegativeInteger(value.stops) ||
    !Array.isArray(value.layovers) ||
    !Array.isArray(value.segments)
  )
    return null;
  const itineraryKey = text(value.itineraryKey),
    originAirport = text(value.originAirport),
    destinationAirport = text(value.destinationAirport);
  const departureTime = text(value.departureTime),
    arrivalTime = text(value.arrivalTime),
    duration = text(value.duration);
  const direction = value.direction;
  const layovers = value.layovers.map(canonicalLayover),
    segments = value.segments.map(canonicalSegment);
  if (
    !itineraryKey ||
    (direction !== "outbound" && direction !== "return") ||
    !originAirport ||
    !destinationAirport ||
    !departureTime ||
    !arrivalTime ||
    !duration ||
    layovers.includes(null) ||
    segments.includes(null) ||
    value.stops !== segments.length - 1
  )
    return null;
  return {
    itineraryKey,
    direction,
    originAirport,
    destinationAirport,
    departureTime,
    arrivalTime,
    duration,
    durationMinutes: value.durationMinutes,
    stops: value.stops,
    layovers: layovers as Layover[],
    segments: segments as FlightSegment[],
  };
}
export function canonicalizeDealsFlightFareV2(
  value: unknown,
): DealsFlightFareV2 | null {
  if (!record(value) || !cabin(value.cabinClass)) return null;
  const fareKey = text(value.fareKey),
    brand = optionalText(value.brand),
    baggageInfo = optionalText(value.baggageInfo),
    refundInfo = optionalText(value.refundInfo);
  if (!fareKey || brand === null || baggageInfo === null || refundInfo === null)
    return null;
  return {
    fareKey,
    ...(brand ? { brand } : {}),
    cabinClass: value.cabinClass,
    ...(baggageInfo ? { baggageInfo } : {}),
    ...(refundInfo ? { refundInfo } : {}),
  };
}
const sameItinerary = (
  left: DealsFlightItineraryV2,
  right: DealsFlightItineraryV2,
) => JSON.stringify(left) === JSON.stringify(right);

export function canonicalizeDealsConfirmedFlightOfferV2(
  value: unknown,
): DealsConfirmedFlightOfferV2 | null {
  if (
    !record(value) ||
    !Array.isArray(value.legs) ||
    !positive(value.sourcePrice) ||
    !cabin(value.cabinClass) ||
    !timestamp(value.providerExpiresAt) ||
    !timestamp(value.selectedAt) ||
    !timestamp(value.validatedAt)
  )
    return null;
  const required = [
    "resultId",
    "provider",
    "providerOfferId",
    "airline",
    "outboundItineraryKey",
    "fareKey",
    "sourceCurrency",
  ] as const;
  const values = Object.fromEntries(
    required.map((key) => [key, text(value[key])]),
  ) as Record<(typeof required)[number], string | null>;
  const returnItineraryKey = optionalText(value.returnItineraryKey),
    flightNumber = optionalText(value.flightNumber),
    baggageInfo = optionalText(value.baggageInfo),
    refundInfo = optionalText(value.refundInfo);
  const legs = value.legs.map(canonicalizeDealsFlightItineraryV2);
  if (
    Object.values(values).some((item) => !item) ||
    returnItineraryKey === null ||
    flightNumber === null ||
    baggageInfo === null ||
    refundInfo === null ||
    legs.includes(null) ||
    value.selectedAt > value.validatedAt ||
    value.validatedAt >= value.providerExpiresAt
  )
    return null;
  return {
    resultId: values.resultId!,
    provider: values.provider!,
    providerOfferId: values.providerOfferId!,
    airline: values.airline!,
    ...(flightNumber ? { flightNumber } : {}),
    outboundItineraryKey: values.outboundItineraryKey!,
    ...(returnItineraryKey ? { returnItineraryKey } : {}),
    fareKey: values.fareKey!,
    legs: legs as DealsFlightItineraryV2[],
    cabinClass: value.cabinClass,
    ...(baggageInfo ? { baggageInfo } : {}),
    ...(refundInfo ? { refundInfo } : {}),
    sourcePrice: value.sourcePrice,
    sourceCurrency: values.sourceCurrency!,
    providerExpiresAt: value.providerExpiresAt,
    selectedAt: value.selectedAt,
    validatedAt: value.validatedAt,
  };
}

function offerMatchesJourney(
  offer: DealsConfirmedFlightOfferV2,
  journey: DealsFlightJourneyV2,
): boolean {
  if (
    !journey.outbound ||
    !journey.fare ||
    offer.outboundItineraryKey !== journey.outbound.itineraryKey ||
    offer.fareKey !== journey.fare.fareKey ||
    offer.cabinClass !== journey.fare.cabinClass
  )
    return false;
  const outbound = offer.legs.find(
    (leg) =>
      leg.itineraryKey === journey.outbound!.itineraryKey &&
      leg.direction === "outbound",
  );
  if (!outbound || !sameItinerary(outbound, journey.outbound)) return false;
  if (journey.tripType === "one-way")
    return offer.returnItineraryKey === undefined && offer.legs.length === 1;
  if (
    !journey.return ||
    offer.returnItineraryKey !== journey.return.itineraryKey
  )
    return false;
  const inbound = offer.legs.find(
    (leg) =>
      leg.itineraryKey === journey.return!.itineraryKey &&
      leg.direction === "return",
  );
  return Boolean(
    inbound &&
    sameItinerary(inbound, journey.return) &&
    offer.legs.length === 2,
  );
}

function canonicalJourney(value: unknown): DealsFlightJourneyV2 | null {
  if (
    !record(value) ||
    !["round-trip", "one-way"].includes(String(value.tripType)) ||
    !["outbound", "return", "fare", "revalidating", "confirmed"].includes(
      String(value.phase),
    )
  )
    return null;
  const searchKey = text(value.searchKey);
  if (!searchKey) return null;
  const outbound =
    value.outbound === undefined
      ? undefined
      : canonicalizeDealsFlightItineraryV2(value.outbound);
  const inbound =
    value.return === undefined
      ? undefined
      : canonicalizeDealsFlightItineraryV2(value.return);
  const fare =
    value.fare === undefined
      ? undefined
      : canonicalizeDealsFlightFareV2(value.fare);
  const offer =
    value.confirmedOffer === undefined
      ? undefined
      : canonicalizeDealsConfirmedFlightOfferV2(value.confirmedOffer);
  if (
    outbound === null ||
    inbound === null ||
    fare === null ||
    offer === null ||
    (outbound !== undefined && outbound.direction !== "outbound") ||
    (inbound !== undefined && inbound.direction !== "return")
  )
    return null;
  const journey: DealsFlightJourneyV2 = {
    searchKey,
    tripType: value.tripType as DealsFlightTripType,
    phase: value.phase as DealsFlightPhaseV2,
    ...(outbound ? { outbound } : {}),
    ...(inbound ? { return: inbound } : {}),
    ...(fare ? { fare } : {}),
    ...(offer ? { confirmedOffer: offer } : {}),
  };
  if (journey.tripType === "one-way" && inbound) return null;
  if (journey.phase === "outbound" && (inbound || fare || offer)) return null;
  if (
    journey.phase === "return" &&
    (journey.tripType !== "round-trip" || !outbound || inbound || fare || offer)
  )
    return null;
  if (
    journey.phase === "fare" &&
    (!outbound || (journey.tripType === "round-trip" && !inbound) || offer)
  )
    return null;
  if (
    journey.phase === "revalidating" &&
    (!outbound ||
      (journey.tripType === "round-trip" && !inbound) ||
      !fare ||
      offer)
  )
    return null;
  if (
    journey.phase === "confirmed" &&
    (!outbound ||
      (journey.tripType === "round-trip" && !inbound) ||
      !fare ||
      !offer ||
      !offerMatchesJourney(offer, journey))
  )
    return null;
  return journey;
}

function canonicalHotel(
  value: unknown,
  updatedAt: number,
): DealsTripPlanHotel | null {
  if (
    !record(value) ||
    !timestamp(value.resultReceivedAt) ||
    value.resultReceivedAt > updatedAt ||
    !positive(value.sourcePrice)
  )
    return null;
  const required = [
    "id",
    "provider",
    "name",
    "location",
    "checkIn",
    "checkOut",
    "sourceCurrency",
  ] as const;
  const values = Object.fromEntries(
    required.map((key) => [key, text(value[key])]),
  ) as Record<(typeof required)[number], string | null>;
  const roomType = optionalText(value.roomType);
  const detailsPath =
    value.detailsPath === undefined
      ? undefined
      : validateDealsProductDetailsPath(
          value.detailsPath,
          "hotel",
          values.id ?? undefined,
        );
  if (
    Object.values(values).some((item) => !item) ||
    roomType === null ||
    (value.detailsPath !== undefined && !detailsPath)
  )
    return null;
  return {
    id: values.id!,
    provider: values.provider!,
    name: values.name!,
    location: values.location!,
    checkIn: values.checkIn!,
    checkOut: values.checkOut!,
    ...(roomType ? { roomType } : {}),
    sourcePrice: value.sourcePrice,
    sourceCurrency: values.sourceCurrency!,
    resultReceivedAt: value.resultReceivedAt,
    ...(detailsPath ? { detailsPath } : {}),
  };
}
function canonicalCar(
  value: unknown,
  updatedAt: number,
): DealsTripPlanCar | null {
  if (
    !record(value) ||
    !timestamp(value.resultReceivedAt) ||
    value.resultReceivedAt > updatedAt ||
    !positive(value.sourcePrice)
  )
    return null;
  const required = [
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
  ] as const;
  const values = Object.fromEntries(
    required.map((key) => [key, text(value[key])]),
  ) as Record<(typeof required)[number], string | null>;
  const detailsPath = validateDealsCarDetailsPath(value.detailsPath);
  if (Object.values(values).some((item) => !item) || !detailsPath) return null;
  return {
    id: values.id!,
    provider: values.provider!,
    rentalCompany: values.rentalCompany!,
    modelName: values.modelName!,
    categoryLabel: values.categoryLabel!,
    pickupLocation: values.pickupLocation!,
    returnLocation: values.returnLocation!,
    pickupDate: values.pickupDate!,
    pickupTime: values.pickupTime!,
    dropoffDate: values.dropoffDate!,
    dropoffTime: values.dropoffTime!,
    sourcePrice: value.sourcePrice,
    sourceCurrency: values.sourceCurrency!,
    resultReceivedAt: value.resultReceivedAt,
    detailsPath,
  };
}

export function canonicalizeDealsTripPlanV2(
  value: unknown,
): DealsTripPlanV2 | null {
  if (
    !record(value) ||
    value.version !== 2 ||
    !dealsPackageModes.includes(value.mode as DealsPackageMode) ||
    !record(value.productSearchKeys) ||
    !record(value.opened) ||
    !nonNegativeInteger(value.revision) ||
    !timestamp(value.createdAt) ||
    !timestamp(value.updatedAt) ||
    !timestamp(value.expiresAt)
  )
    return null;
  const mode = value.mode as DealsPackageMode,
    searchFingerprint = text(value.searchFingerprint);
  const hotelKey = text(value.productSearchKeys.hotel),
    flightKey = text(value.productSearchKeys.flight),
    carKey = text(value.productSearchKeys.car);
  if (
    !searchFingerprint ||
    !hotelKey ||
    !flightKey ||
    !carKey ||
    value.updatedAt < value.createdAt ||
    value.expiresAt <= value.createdAt ||
    value.expiresAt > value.createdAt + DEALS_TRIP_PLAN_TTL_MS
  )
    return null;
  const hotel =
    value.hotel === undefined
      ? undefined
      : canonicalHotel(value.hotel, value.updatedAt);
  const car =
    value.car === undefined
      ? undefined
      : canonicalCar(value.car, value.updatedAt);
  const flightJourney =
    value.flightJourney === undefined
      ? undefined
      : canonicalJourney(value.flightJourney);
  if (
    hotel === null ||
    car === null ||
    flightJourney === null ||
    (flightJourney?.confirmedOffer &&
      flightJourney.confirmedOffer.validatedAt > value.updatedAt)
  )
    return null;
  const included = getIncludedProducts(mode);
  if (
    (!included.hotel && hotel) ||
    (!included.car && car) ||
    included.flight !== Boolean(flightJourney) ||
    (flightJourney && flightJourney.searchKey !== flightKey)
  )
    return null;
  const opened: DealsTripPlanV2["opened"] = {};
  for (const product of ["hotel", "flight", "car"] as const) {
    const openedAt = value.opened[product];
    if (
      openedAt !== undefined &&
      (!timestamp(openedAt) ||
        openedAt < value.createdAt ||
        openedAt > value.updatedAt ||
        !included[product])
    )
      return null;
    if (openedAt !== undefined) opened[product] = openedAt;
  }
  return {
    version: 2,
    mode,
    searchFingerprint,
    productSearchKeys: { hotel: hotelKey, flight: flightKey, car: carKey },
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    expiresAt: value.expiresAt,
    revision: value.revision,
    ...(hotel ? { hotel } : {}),
    ...(car ? { car } : {}),
    ...(flightJourney ? { flightJourney } : {}),
    opened,
  };
}

export function parseDealsTripPlanV2(
  raw: string | null,
): DealsTripPlanV2 | null {
  if (raw === null) return null;
  try {
    return canonicalizeDealsTripPlanV2(JSON.parse(raw));
  } catch {
    return null;
  }
}
export function serializeDealsTripPlanV2(plan: DealsTripPlanV2): string {
  const canonical = canonicalizeDealsTripPlanV2(plan);
  if (!canonical) throw new TypeError("Invalid Deals trip plan v2");
  return JSON.stringify(canonical);
}
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
          flightJourney: {
            searchKey: productSearchKeys.flight,
            tripType: search.flightTripType,
            phase: "outbound" as const,
          },
        }
      : {}),
    opened: {},
  };
}

export const areDealsFlightOfferAndJourneyConsistentV2 = offerMatchesJourney;
