import { nanoid } from "nanoid";
import type { FlightSearchParams, Layover, NormalizedFlightResult } from "@/lib/types";
import { minutesToDuration, sanitizeAirportCode } from "@/lib/utils";
import { scoreFlight } from "@/services/travel/scoring";
import { buildTravelpayoutsAffiliateUrl, getTravelpayoutsMarker } from "@/services/travel/providers/travelpayoutsProvider";

const airlineNames: Record<string, string> = {
  AA: "American Airlines",
  AC: "Air Canada",
  AF: "Air France",
  AS: "Alaska Airlines",
  BA: "British Airways",
  B6: "JetBlue",
  DL: "Delta Air Lines",
  EK: "Emirates",
  LH: "Lufthansa",
  NK: "Spirit Airlines",
  QR: "Qatar Airways",
  UA: "United Airlines",
  WN: "Southwest Airlines",
};

export function normalizeFlightResult(
  provider: "Amadeus" | "Duffel" | "Kiwi" | "Development Fallback",
  raw: unknown,
  search: FlightSearchParams,
): NormalizedFlightResult | null {
  if (provider === "Amadeus") return normalizeAmadeusFlight(raw, search);
  if (provider === "Duffel") return normalizeDuffelFlight(raw, search);
  if (provider === "Kiwi") return normalizeKiwiFlight(raw, search);
  return normalizeFallbackFlight(raw, search);
}

function normalizeAmadeusFlight(raw: unknown, search: FlightSearchParams): NormalizedFlightResult | null {
  const offer = raw as {
    id?: string;
    itineraries?: Array<{
      duration?: string;
      segments?: Array<{
        departure?: { iataCode?: string; at?: string };
        arrival?: { iataCode?: string; at?: string };
        carrierCode?: string;
        number?: string;
        duration?: string;
      }>;
    }>;
    price?: { grandTotal?: string; currency?: string };
    travelerPricings?: Array<{ fareDetailsBySegment?: Array<{ cabin?: string; includedCheckedBags?: unknown }> }>;
    validatingAirlineCodes?: string[];
  };

  const segments = offer.itineraries?.[0]?.segments ?? [];
  const first = segments[0];
  const last = segments[segments.length - 1];
  if (!first?.departure?.at || !last?.arrival?.at || !offer.price?.grandTotal) return null;

  const carrier = first.carrierCode || offer.validatingAirlineCodes?.[0] || "Flight";
  const durationMinutes = parseIsoDuration(offer.itineraries?.[0]?.duration) || estimateDuration(first.departure.at, last.arrival.at);
  const layovers = buildLayovers(segments);
  const baggageInfo = offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.includedCheckedBags
    ? "Checked baggage details available"
    : "Baggage rules vary by fare";

  return buildFlight({
    provider: "Amadeus",
    providerId: offer.id,
    airlineName: airlineNames[carrier] || carrier,
    flightNumber: `${carrier}${first.number || ""}`.trim(),
    originAirport: first.departure.iataCode || sanitizeAirportCode(search.origin),
    destinationAirport: last.arrival.iataCode || sanitizeAirportCode(search.destination),
    departureTime: first.departure.at,
    arrivalTime: last.arrival.at,
    durationMinutes,
    stops: Math.max(segments.length - 1, 0),
    layovers,
    cabinClass: search.cabinClass,
    baggageInfo,
    refundInfo: "Fare rules are reviewed on the external provider site.",
    price: Number(offer.price.grandTotal),
    currency: offer.price.currency || "USD",
    rawProviderReference: { provider: "amadeus", id: offer.id },
  });
}

function normalizeDuffelFlight(raw: unknown, search: FlightSearchParams): NormalizedFlightResult | null {
  const offer = raw as {
    id?: string;
    total_amount?: string;
    total_currency?: string;
    owner?: { name?: string; iata_code?: string };
    conditions?: {
      change_before_departure?: { allowed?: boolean; penalty_amount?: string; penalty_currency?: string };
      refund_before_departure?: { allowed?: boolean; penalty_amount?: string; penalty_currency?: string };
    };
    passengers?: Array<{
      baggages?: Array<{ type?: string; quantity?: number }>;
    }>;
    slices?: Array<{
      duration?: string;
      segments?: Array<{
        id?: string;
        departing_at?: string;
        arriving_at?: string;
        origin?: { iata_code?: string; name?: string };
        destination?: { iata_code?: string; name?: string };
        operating_carrier?: { name?: string; iata_code?: string };
        marketing_carrier?: { name?: string; iata_code?: string };
        marketing_carrier_flight_number?: string;
        passengers?: Array<{
          cabin_class?: string;
          baggages?: Array<{ type?: string; quantity?: number }>;
        }>;
      }>;
    }>;
  };

  const segments = offer.slices?.[0]?.segments ?? [];
  const first = segments[0];
  const last = segments[segments.length - 1];
  if (!first?.departing_at || !last?.arriving_at || !offer.total_amount) return null;

  const carrier = first.marketing_carrier?.iata_code || first.operating_carrier?.iata_code || "";
  const airlineName = first.marketing_carrier?.name || first.operating_carrier?.name || offer.owner?.name || airlineNames[carrier] || "Airline";
  const durationMinutes = parseIsoDuration(offer.slices?.[0]?.duration) || estimateDuration(first.departing_at, last.arriving_at);
  const cabinClass = formatDuffelCabin(first.passengers?.[0]?.cabin_class) || search.cabinClass;
  const baggageInfo = buildDuffelBaggageInfo(first.passengers?.[0]?.baggages || offer.passengers?.[0]?.baggages);
  const refundInfo = buildDuffelRefundInfo(offer.conditions);
  const price = Number(offer.total_amount);
  if (!Number.isFinite(price)) return null;

  return buildFlight({
    provider: "Duffel",
    providerId: offer.id,
    airlineName,
    flightNumber: `${carrier}${first.marketing_carrier_flight_number || ""}`.trim(),
    originAirport: first.origin?.iata_code || sanitizeAirportCode(search.origin),
    destinationAirport: last.destination?.iata_code || sanitizeAirportCode(search.destination),
    departureTime: first.departing_at,
    arrivalTime: last.arriving_at,
    durationMinutes,
    stops: Math.max(segments.length - 1, 0),
    layovers: buildDuffelLayovers(segments),
    cabinClass,
    baggageInfo,
    refundInfo,
    price,
    currency: offer.total_currency || "USD",
    rawProviderReference: {
      provider: "duffel",
      id: offer.id,
      liveOffer: true,
      sliceIds: offer.slices?.flatMap((slice) => slice.segments?.map((segment) => segment.id).filter(Boolean) || []),
    },
  });
}

function normalizeKiwiFlight(raw: unknown, search: FlightSearchParams): NormalizedFlightResult | null {
  const offer = raw as {
    id?: string;
    price?: number;
    currency?: string;
    airlines?: string[];
    route?: Array<{
      flyFrom?: string;
      flyTo?: string;
      local_departure?: string;
      local_arrival?: string;
      airline?: string;
      flight_no?: number;
    }>;
    duration?: { total?: number; departure?: number };
    deep_link?: string;
  };

  const route = offer.route ?? [];
  const first = route[0];
  const last = route[route.length - 1];
  if (!first?.local_departure || !last?.local_arrival || !offer.price) return null;

  const carrier = first.airline || offer.airlines?.[0] || "";
  const durationMinutes = Math.round((offer.duration?.departure || offer.duration?.total || 0) / 60) || estimateDuration(first.local_departure, last.local_arrival);

  return buildFlight({
    provider: "Kiwi",
    providerId: offer.id,
    airlineName: airlineNames[carrier] || carrier || "Airline",
    flightNumber: `${carrier}${first.flight_no || ""}`.trim(),
    originAirport: first.flyFrom || sanitizeAirportCode(search.origin),
    destinationAirport: last.flyTo || sanitizeAirportCode(search.destination),
    departureTime: first.local_departure,
    arrivalTime: last.local_arrival,
    durationMinutes,
    stops: Math.max(route.length - 1, 0),
    layovers: buildKiwiLayovers(route),
    cabinClass: search.cabinClass,
    baggageInfo: "Baggage rules are shown by the external provider.",
    refundInfo: "Fare rules are reviewed on the external provider site.",
    price: Number(offer.price),
    currency: offer.currency || "USD",
    bookingUrl: offer.deep_link,
    rawProviderReference: { provider: "kiwi", id: offer.id },
  });
}

function normalizeFallbackFlight(raw: unknown, search: FlightSearchParams): NormalizedFlightResult {
  const item = raw as Partial<NormalizedFlightResult>;
  return buildFlight({
    provider: "Development Fallback",
    providerId: item.id,
    airlineName: item.airlineName || "United Airlines",
    flightNumber: item.flightNumber || "UA1482",
    originAirport: sanitizeAirportCode(search.origin),
    destinationAirport: sanitizeAirportCode(search.destination),
    departureTime: item.departureTime || `${search.departureDate}T08:30:00`,
    arrivalTime: item.arrivalTime || `${search.departureDate}T14:45:00`,
    durationMinutes: item.durationMinutes || 375,
    stops: item.stops ?? 0,
    layovers: item.layovers || [],
    cabinClass: search.cabinClass,
    baggageInfo: item.baggageInfo || "Baggage details are reviewed on the external provider site.",
    refundInfo: item.refundInfo || "Change and refund rules vary by fare and are reviewed externally.",
    price: item.price || 286,
    currency: item.currency || "USD",
    bookingUrl: item.bookingUrl,
    rawProviderReference: { provider: "fallback", id: item.id },
  });
}

function buildFlight(input: {
  provider: NormalizedFlightResult["provider"];
  providerId?: string;
  airlineName: string;
  flightNumber?: string;
  originAirport: string;
  destinationAirport: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  stops: number;
  layovers: Layover[];
  cabinClass: string;
  baggageInfo: string;
  refundInfo: string;
  price: number;
  currency: string;
  bookingUrl?: string;
  rawProviderReference?: unknown;
}): NormalizedFlightResult {
  const scores = scoreFlight(input);
  const partnerUrl = input.bookingUrl || buildMetasearchPartnerUrl(input);

  return {
    id: `${input.provider.toLowerCase().replace(/\s+/g, "-")}-${input.providerId || nanoid(10)}`,
    provider: input.provider,
    airlineName: input.airlineName,
    airlineLogo: buildAirlineLogo(input.flightNumber),
    flightNumber: input.flightNumber,
    originAirport: input.originAirport,
    destinationAirport: input.destinationAirport,
    departureTime: input.departureTime,
    arrivalTime: input.arrivalTime,
    duration: minutesToDuration(input.durationMinutes),
    durationMinutes: input.durationMinutes,
    stops: input.stops,
    layovers: input.layovers,
    cabinClass: input.cabinClass,
    baggageInfo: input.baggageInfo,
    refundInfo: input.refundInfo,
    price: Number(input.price.toFixed(2)),
    currency: input.currency,
    bookingUrl: partnerUrl,
    partnerRedirectUrl: partnerUrl,
    ...scores,
    recommendationReasons: buildReasons(input, scores),
    badges: [],
    rawProviderReference: input.rawProviderReference,
  };
}

function buildReasons(input: { price: number; stops: number; baggageInfo: string }, scores: ReturnType<typeof scoreFlight>) {
  const reasons = [];
  if (input.stops === 0) reasons.push("Nonstop route lowers travel effort.");
  if (scores.valueScore >= 78) reasons.push("Strong balance of price, duration, and comfort.");
  if (scores.riskScore <= 35) reasons.push("Lower disruption risk based on route complexity.");
  if (input.baggageInfo.toLowerCase().includes("included")) reasons.push("Baggage details appear favorable.");
  if (reasons.length === 0) reasons.push("Affordable option with transparent external provider comparison.");
  return reasons;
}

function buildLayovers(segments: Array<{ arrival?: { iataCode?: string; at?: string }; departure?: { at?: string } }>) {
  const layovers: Layover[] = [];
  for (let index = 0; index < segments.length - 1; index += 1) {
    const current = segments[index];
    const next = segments[index + 1];
    layovers.push({
      airport: current.arrival?.iataCode || "Connection",
      duration: minutesToDuration(estimateDuration(current.arrival?.at, next.departure?.at)),
      quality: classifyLayover(estimateDuration(current.arrival?.at, next.departure?.at)),
    });
  }
  return layovers;
}

function buildDuffelLayovers(
  segments: Array<{ arriving_at?: string; departing_at?: string; destination?: { iata_code?: string } }>,
) {
  const layovers: Layover[] = [];
  for (let index = 0; index < segments.length - 1; index += 1) {
    const current = segments[index];
    const next = segments[index + 1];
    const minutes = estimateDuration(current.arriving_at, next.departing_at);
    layovers.push({
      airport: current.destination?.iata_code || "Connection",
      duration: minutesToDuration(minutes),
      quality: classifyLayover(minutes),
    });
  }
  return layovers;
}

function buildDuffelBaggageInfo(baggages?: Array<{ type?: string; quantity?: number }>) {
  if (!baggages?.length) return "Baggage details are reviewed on the external provider site.";

  const checked = baggages.find((bag) => bag.type === "checked");
  const carryOn = baggages.find((bag) => bag.type === "carry_on");
  const parts = [];
  if (carryOn?.quantity) parts.push(`${carryOn.quantity} carry-on included`);
  if (checked?.quantity) parts.push(`${checked.quantity} checked bag${checked.quantity > 1 ? "s" : ""} included`);
  return parts.length ? parts.join(", ") : "Baggage details are reviewed on the external provider site.";
}

function buildDuffelRefundInfo(conditions?: {
  change_before_departure?: { allowed?: boolean; penalty_amount?: string; penalty_currency?: string };
  refund_before_departure?: { allowed?: boolean; penalty_amount?: string; penalty_currency?: string };
}) {
  const refund = conditions?.refund_before_departure;
  const change = conditions?.change_before_departure;
  const parts = [];

  if (refund?.allowed === true) {
    parts.push(refund.penalty_amount ? `Refundable before departure with ${refund.penalty_currency || ""} ${refund.penalty_amount} penalty`.trim() : "Refundable before departure");
  } else if (refund?.allowed === false) {
    parts.push("Not refundable before departure");
  }

  if (change?.allowed === true) {
    parts.push(change.penalty_amount ? `Changes allowed with ${change.penalty_currency || ""} ${change.penalty_amount} penalty`.trim() : "Changes allowed before departure");
  } else if (change?.allowed === false) {
    parts.push("Changes not allowed before departure");
  }

  return parts.length ? parts.join(". ") : "Change and refund rules vary by fare and are reviewed externally.";
}

function buildMetasearchPartnerUrl(input: {
  provider: NormalizedFlightResult["provider"];
  originAirport: string;
  destinationAirport: string;
  departureTime: string;
}) {
  if (!getTravelpayoutsMarker()) return "";

  return buildTravelpayoutsAffiliateUrl({
    origin: input.originAirport,
    destination: input.destinationAirport,
    departureDate: input.departureTime.slice(0, 10),
    subId: `${input.provider.toLowerCase().replace(/\s+/g, "-")}-metasearch`,
  });
}

function formatDuffelCabin(value?: string) {
  if (!value) return "";
  return value.replace(/_/g, " ");
}

function buildKiwiLayovers(route: Array<{ local_arrival?: string; local_departure?: string; flyTo?: string }>) {
  const layovers: Layover[] = [];
  for (let index = 0; index < route.length - 1; index += 1) {
    const current = route[index];
    const next = route[index + 1];
    const minutes = estimateDuration(current.local_arrival, next.local_departure);
    layovers.push({
      airport: current.flyTo || "Connection",
      duration: minutesToDuration(minutes),
      quality: classifyLayover(minutes),
    });
  }
  return layovers;
}

function parseIsoDuration(value?: string) {
  if (!value) return 0;
  const match = value.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  return Number(match[1] || 0) * 60 + Number(match[2] || 0);
}

function estimateDuration(start?: string, end?: string) {
  if (!start || !end) return 0;
  const minutes = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
}

function classifyLayover(minutes: number): Layover["quality"] {
  if (!minutes) return "unknown";
  if (minutes < 45) return "short";
  if (minutes <= 180) return "good";
  if (minutes >= 480) return "overnight";
  return "long";
}

function buildAirlineLogo(flightNumber?: string) {
  const carrier = flightNumber?.match(/^[A-Z0-9]{2}/)?.[0];
  return carrier ? `https://images.kiwi.com/airlines/64/${carrier}.png` : undefined;
}
