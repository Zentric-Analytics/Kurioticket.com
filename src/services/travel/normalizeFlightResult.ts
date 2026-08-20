import { nanoid } from "nanoid";
import type {
  FlightFareTerm,
  FlightLeg,
  FlightSearchParams,
  Layover,
  NormalizedFlightResult,
} from "@/lib/types";
import { minutesToDuration } from "@/lib/utils";
import { scoreFlight } from "@/services/travel/scoring";

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

type DuffelCarrier = {
  id?: string;
  name?: string;
  iata_code?: string;
  logo_symbol_url?: string | null;
  logo_lockup_url?: string | null;
};

const carrierWithName = (carrier?: DuffelCarrier) =>
  carrier?.name?.trim() ? carrier : undefined;

const sameCarrier = (left: DuffelCarrier, right?: DuffelCarrier) => {
  if (!right) return false;

  const leftId = left.id?.trim();
  const rightId = right.id?.trim();
  if (leftId && rightId) return leftId === rightId;

  const leftIata = left.iata_code?.trim().toUpperCase();
  const rightIata = right.iata_code?.trim().toUpperCase();
  if (leftIata && rightIata) return leftIata === rightIata;

  return (
    left.name?.trim().toLocaleLowerCase() ===
    right.name?.trim().toLocaleLowerCase()
  );
};

const cleanPublicUrl = (value?: string | null) => {
  const url = value?.trim();
  return url && /^https:\/\//i.test(url) ? url : undefined;
};

const carrierLogo = (
  displayedCarrier: DuffelCarrier,
  carriers: Array<DuffelCarrier | undefined>,
) => {
  // Some Duffel offer shapes repeat the same airline at segment and owner
  // level, but only one copy contains its asset URLs. Search only equivalent
  // carrier records so the logo can never belong to a different airline.
  for (const carrier of carriers) {
    if (!sameCarrier(displayedCarrier, carrier)) continue;
    const logo =
      cleanPublicUrl(carrier?.logo_symbol_url) ||
      cleanPublicUrl(carrier?.logo_lockup_url);
    if (logo) return logo;
  }
  return null;
};

export function normalizeFlightResult(
  provider: "Duffel",
  raw: unknown,
  search: FlightSearchParams,
): NormalizedFlightResult | null {
  return normalizeDuffelFlight(raw, search);
}

function normalizeDuffelFlight(
  raw: unknown,
  search: FlightSearchParams,
): NormalizedFlightResult | null {
  const offer = raw as {
    id?: string;
    expires_at?: string;
    total_amount?: string;
    total_currency?: string;
    fare_brand_name?: string;
    owner?: DuffelCarrier;
    conditions?: {
      change_before_departure?: {
        allowed?: boolean;
        penalty_amount?: string;
        penalty_currency?: string;
      };
      refund_before_departure?: {
        allowed?: boolean;
        penalty_amount?: string;
        penalty_currency?: string;
      };
    };
    passengers?: Array<{
      baggages?: Array<{ type?: string; quantity?: number }>;
    }>;
    slices?: Array<{
      fare_brand_name?: string;
      conditions?: DuffelConditions;
      duration?: string;
      segments?: Array<{
        id?: string;
        departing_at?: string;
        arriving_at?: string;
        origin?: { iata_code?: string; name?: string };
        destination?: { iata_code?: string; name?: string };
        operating_carrier?: DuffelCarrier;
        marketing_carrier?: DuffelCarrier;
        marketing_carrier_flight_number?: string;
        passengers?: Array<{
          cabin_class?: string;
          fare_brand_name?: string;
          baggages?: Array<{ type?: string; quantity?: number }>;
        }>;
      }>;
    }>;
  };

  const providerOfferId = offer.id?.trim();
  const providerExpiresAt = parseProviderExpiry(offer.expires_at);
  if (!providerOfferId || providerExpiresAt === null) return null;

  const legs = buildDuffelLegs(offer, search);
  const primaryLeg = legs[0];
  const segments = offer.slices?.[0]?.segments ?? [];
  const first = segments[0];
  if (
    !primaryLeg ||
    !first ||
    !offer.total_amount ||
    !hasRequiredLegs(legs, search)
  )
    return null;

  // Keep the public logo tied to the exact carrier identity used for the label.
  // Duffel normally supplies a marketing carrier, with operating carrier and
  // offer owner acting as progressively broader fallbacks.
  const displayedCarrier =
    carrierWithName(first.marketing_carrier) ||
    carrierWithName(first.operating_carrier) ||
    carrierWithName(offer.owner);
  const carrier =
    displayedCarrier?.iata_code ||
    first.marketing_carrier?.iata_code ||
    first.operating_carrier?.iata_code ||
    "";
  const airlineName = displayedCarrier?.name || airlineNames[carrier];
  if (!airlineName) return null;
  const airlineLogo = displayedCarrier
    ? carrierLogo(displayedCarrier, [
        displayedCarrier,
        first.marketing_carrier,
        first.operating_carrier,
        offer.owner,
      ])
    : null;
  const cabinClass = formatDuffelCabin(first.passengers?.[0]?.cabin_class);
  const legBrands = legs.flatMap(({ fareBrandName }) => fareBrandName ? [fareBrandName] : []);
  const uniqueLegBrands = [...new Set(legBrands.map((brand) => brand.trim()).filter(Boolean))];
  const fareBrandName = uniqueLegBrands.length > 1
    ? undefined
    : uniqueLegBrands[0] || offer.fare_brand_name?.trim() || first.passengers?.[0]?.fare_brand_name?.trim() || undefined;
  const baggageTerms = buildDuffelBaggageTerms(offer);
  const conditionTerms = buildDuffelConditionTerms(offer);
  const fareTerms = [...baggageTerms, ...conditionTerms];
  const baggageInfo = summarizeBaggageTerms(baggageTerms);
  const refundInfo = conditionTerms.map(({ text }) => text).join(". ") || "Change and refund rules not supplied by the provider";
  const price = Number(offer.total_amount);
  const currency = offer.total_currency?.trim().toUpperCase();
  if (!Number.isFinite(price) || price <= 0 || !currency || !/^[A-Z]{3}$/.test(currency))
    return null;

  return buildFlight({
    provider: "Duffel",
    providerId: providerOfferId,
    providerOfferId,
    providerExpiresAt,
    airlineName,
    airlineLogo,
    flightNumber:
      `${carrier}${first.marketing_carrier_flight_number || ""}`.trim(),
    originAirport: primaryLeg.originAirport,
    destinationAirport: primaryLeg.destinationAirport,
    departureTime: primaryLeg.departureTime,
    arrivalTime: primaryLeg.arrivalTime,
    durationMinutes: primaryLeg.durationMinutes,
    stops: primaryLeg.stops,
    layovers: primaryLeg.layovers,
    legs,
    cabinClass,
    fareBrandName,
    baggageInfo,
    refundInfo,
    fareTerms,
    price,
    currency,
    rawProviderReference: {
      provider: "duffel",
      id: offer.id,
      liveOffer: true,
      sliceIds: offer.slices?.flatMap(
        (slice) =>
          slice.segments?.map((segment) => segment.id).filter(Boolean) || [],
      ),
    },
  });
}

function buildFlight(input: {
  provider: NormalizedFlightResult["provider"];
  providerId?: string;
  providerOfferId?: string;
  providerExpiresAt?: number;
  airlineName: string;
  airlineLogo?: string | null;
  flightNumber?: string;
  originAirport: string;
  destinationAirport: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  stops: number;
  layovers: Layover[];
  legs?: FlightLeg[];
  cabinClass: string;
  fareBrandName?: string;
  baggageInfo: string;
  refundInfo: string;
  fareTerms?: FlightFareTerm[];
  price: number;
  currency: string;
  bookingUrl?: string;
  rawProviderReference?: unknown;
}): NormalizedFlightResult {
  const scores = scoreFlight(input);
  const partnerUrl = input.bookingUrl || buildMetasearchPartnerUrl();

  return {
    id: `${input.provider.toLowerCase().replace(/\s+/g, "-")}-${input.providerId || nanoid(10)}`,
    provider: input.provider,
    airlineName: input.airlineName,
    airlineLogo: input.airlineLogo,
    flightNumber: input.flightNumber,
    originAirport: input.originAirport,
    destinationAirport: input.destinationAirport,
    departureTime: input.departureTime,
    arrivalTime: input.arrivalTime,
    duration: minutesToDuration(input.durationMinutes),
    durationMinutes: input.durationMinutes,
    stops: input.stops,
    layovers: input.layovers,
    legs: input.legs,
    cabinClass: input.cabinClass,
    fareBrandName: input.fareBrandName,
    baggageInfo: input.baggageInfo,
    refundInfo: input.refundInfo,
    fareTerms: input.fareTerms,
    price: Number(input.price.toFixed(2)),
    currency: input.currency,
    bookingUrl: partnerUrl,
    partnerRedirectUrl: partnerUrl,
    ...scores,
    recommendationReasons: buildReasons(input, scores),
    badges: [],
    providerOfferId: input.providerOfferId,
    providerExpiresAt: input.providerExpiresAt,
    rawProviderReference: input.rawProviderReference,
  };
}

function buildReasons(
  input: { price: number; stops: number; baggageInfo: string },
  scores: ReturnType<typeof scoreFlight>,
) {
  const reasons = [];
  if (input.stops === 0) reasons.push("Nonstop route lowers travel effort.");
  if (scores.valueScore >= 78)
    reasons.push("Strong balance of price, duration, and comfort.");
  if (scores.riskScore <= 35)
    reasons.push("Lower disruption risk based on route complexity.");
  if (input.baggageInfo.toLowerCase().includes("included"))
    reasons.push("Baggage details appear favorable.");
  if (reasons.length === 0)
    reasons.push(
      "Affordable option with transparent external provider comparison.",
    );
  return reasons;
}

function buildDuffelLegs(
  offer: {
    owner?: { name?: string };
    slices?: Array<{
      fare_brand_name?: string;
      duration?: string;
      segments?: Array<{
        departing_at?: string;
        arriving_at?: string;
        origin?: { iata_code?: string };
        destination?: { iata_code?: string };
        operating_carrier?: { name?: string; iata_code?: string };
        marketing_carrier?: { name?: string; iata_code?: string };
        marketing_carrier_flight_number?: string;
        passengers?: Array<{ fare_brand_name?: string }>;
      }>;
    }>;
  },
  search: FlightSearchParams,
): FlightLeg[] {
  return (offer.slices ?? [])
    .map((slice, index) => {
      const segments = slice.segments ?? [];
      const first = segments[0];
      const last = segments[segments.length - 1];
      if (
        !first?.departing_at ||
        !last?.arriving_at ||
        !first.origin?.iata_code ||
        !last.destination?.iata_code ||
        segments.some(
          (segment) =>
            !segment.departing_at ||
            !segment.arriving_at ||
            !segment.origin?.iata_code ||
            !segment.destination?.iata_code ||
            !(
              segment.marketing_carrier?.name?.trim() ||
              segment.operating_carrier?.name?.trim() ||
              offer.owner?.name?.trim()
            ) ||
            !Number.isFinite(Date.parse(segment.departing_at)) ||
            !Number.isFinite(Date.parse(segment.arriving_at)) ||
            Date.parse(segment.arriving_at) <= Date.parse(segment.departing_at),
        )
      )
        return null;

      for (let segmentIndex = 1; segmentIndex < segments.length; segmentIndex += 1) {
        const previous = segments[segmentIndex - 1];
        const current = segments[segmentIndex];
        if (
          previous.destination?.iata_code?.toUpperCase() !== current.origin?.iata_code?.toUpperCase() ||
          Date.parse(current.departing_at!) <= Date.parse(previous.arriving_at!)
        ) return null;
      }

      const durationMinutes =
        parseIsoDuration(slice.duration) ||
        estimateDuration(first.departing_at, last.arriving_at);
      if (!durationMinutes) return null;

      const fareBrandName = resolveDuffelSliceFareBrand(slice);
      return {
        direction: legDirection(index, search),
        originAirport: first.origin.iata_code,
        destinationAirport: last.destination.iata_code,
        departureTime: first.departing_at,
        arrivalTime: last.arriving_at,
        duration: minutesToDuration(durationMinutes),
        durationMinutes,
        stops: Math.max(segments.length - 1, 0),
        layovers: buildDuffelLayovers(segments),
        segments: segments.map((segment) => {
            const carrier =
              segment.marketing_carrier?.iata_code ||
              segment.operating_carrier?.iata_code ||
              "";
            const airlineName =
              segment.marketing_carrier?.name ||
              segment.operating_carrier?.name ||
              offer.owner?.name;
            return {
              originAirport: segment.origin?.iata_code || "",
              destinationAirport: segment.destination?.iata_code || "",
              departureTime: segment.departing_at || "",
              arrivalTime: segment.arriving_at || "",
              airlineName,
              flightNumber:
                `${carrier}${segment.marketing_carrier_flight_number || ""}`.trim(),
            };
          }),
        ...(fareBrandName ? { fareBrandName } : {}),
      } satisfies FlightLeg;
    })
    .filter(Boolean) as FlightLeg[];
}

function hasRequiredLegs(legs: FlightLeg[], search: FlightSearchParams) {
  const expectedOrigin = search.origin.trim().toUpperCase();
  const expectedDestination = search.destination.trim().toUpperCase();
  const outbound = legs[0];
  if (
    !outbound ||
    outbound.originAirport.toUpperCase() !== expectedOrigin ||
    outbound.destinationAirport.toUpperCase() !== expectedDestination
  ) return false;
  if (search.tripType === "round-trip") {
    return (
      legs.length === 2 &&
      legs[0]?.direction === "outbound" &&
      legs[1]?.direction === "return" &&
      legs[1].originAirport.toUpperCase() === expectedDestination &&
      legs[1].destinationAirport.toUpperCase() === expectedOrigin
    );
  }
  if (search.tripType === "one-way")
    return legs.length === 1 && legs[0]?.direction === "outbound";
  return legs.length > 0;
}

function parseProviderExpiry(value?: string) {
  if (!value?.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function legDirection(
  index: number,
  search: FlightSearchParams,
): FlightLeg["direction"] {
  if (index === 0) return "outbound";
  if (index === 1 && search.tripType === "round-trip") return "return";
  return "leg";
}

function buildDuffelLayovers(
  segments: Array<{
    arriving_at?: string;
    departing_at?: string;
    destination?: { iata_code?: string };
  }>,
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

type DuffelConditions = {
  change_before_departure?: {
    allowed?: boolean;
    penalty_amount?: string;
    penalty_currency?: string;
  };
  refund_before_departure?: {
    allowed?: boolean;
    penalty_amount?: string;
    penalty_currency?: string;
  };
};

function resolveDuffelSliceFareBrand(slice: {
  fare_brand_name?: string;
  segments?: Array<{ passengers?: Array<{ fare_brand_name?: string }> }>;
}) {
  const sliceBrand = slice.fare_brand_name?.trim();
  if (sliceBrand) return sliceBrand;
  const passengerBrands = [...new Set((slice.segments ?? []).flatMap((segment) =>
    (segment.passengers ?? []).flatMap((passenger) => passenger.fare_brand_name?.trim() ? [passenger.fare_brand_name.trim()] : []),
  ))];
  return passengerBrands.length === 1 ? passengerBrands[0] : undefined;
}

function buildDuffelBaggageTerms(offer: {
  passengers?: Array<{ baggages?: Array<{ type?: string; quantity?: number }> }>;
  slices?: Array<{ segments?: Array<{ passengers?: Array<{ baggages?: Array<{ type?: string; quantity?: number }> }> }> }>;
}): FlightFareTerm[] {
  const byLeg = (offer.slices ?? []).map((slice, index) => {
    const allowances = (slice.segments ?? []).flatMap((segment) =>
      (segment.passengers ?? []).map((passenger) => passenger.baggages ?? []),
    );
    const source = allowances.length ? allowances : (index === 0 ? (offer.passengers ?? []).map((passenger) => passenger.baggages ?? []) : []);
    const descriptions = [...new Set(source.map((bags) => describeIncludedBaggage(bags)))];
    const direction: FlightLeg["direction"] = index === 0 ? "outbound" : index === 1 ? "return" : "leg";
    return descriptions.map((description) => ({
      category: "baggage" as const,
      semantic: description ? "positive" as const : "informational" as const,
      text: `${direction === "outbound" ? "Outbound" : direction === "return" ? "Return" : "Leg"}: ${description || "baggage allowance not supplied for one or more passengers"}`,
      legDirection: direction,
    }));
  }).flat();
  return byLeg.length ? byLeg : [{ category: "baggage", semantic: "informational", text: "Baggage details not supplied by the provider" }];
}

function describeIncludedBaggage(baggages: Array<{ type?: string; quantity?: number }>) {
  const parts: string[] = [];
  for (const type of ["carry_on", "checked"] as const) {
    const quantities = baggages.filter((bag) => bag.type === type && Number.isInteger(bag.quantity) && bag.quantity! > 0).map((bag) => bag.quantity!);
    const quantity = quantities.length ? Math.min(...quantities) : 0;
    if (quantity) parts.push(`${quantity} ${type === "carry_on" ? "carry-on" : `checked bag${quantity > 1 ? "s" : ""}`} included`);
  }
  return parts.join(", ");
}

function summarizeBaggageTerms(terms: FlightFareTerm[]) {
  if (terms.length === 1) {
    if (terms[0].semantic === "informational")
      return "Baggage details not supplied by the provider";
    return terms[0].text.replace(/^(Outbound|Return|Leg): /, "");
  }
  return terms.map(({ text }) => text).join(". ") || "Baggage details not supplied by the provider";
}

function buildDuffelConditionTerms(offer: { conditions?: DuffelConditions; slices?: Array<{ conditions?: DuffelConditions }> }): FlightFareTerm[] {
  const sources = (offer.slices ?? []).some((slice) => slice.conditions)
    ? (offer.slices ?? []).map((slice, index) => ({ conditions: slice.conditions, direction: index === 0 ? "outbound" as const : index === 1 ? "return" as const : "leg" as const }))
    : [{ conditions: offer.conditions, direction: undefined }];
  const terms = sources.flatMap(({ conditions, direction }) => conditionTerms(conditions, direction));
  return terms.length ? terms : [
    { category: "refund", semantic: "informational", text: "Change and refund rules not supplied by the provider" },
  ];
}

function conditionTerms(conditions?: DuffelConditions, legDirection?: FlightLeg["direction"]): FlightFareTerm[] {
  const refund = conditions?.refund_before_departure;
  const change = conditions?.change_before_departure;
  const prefix = legDirection === "outbound" ? "Outbound: " : legDirection === "return" ? "Return: " : legDirection === "leg" ? "Leg: " : "";
  const parts: FlightFareTerm[] = [];

  if (refund?.allowed === true) {
    parts.push({ category: "refund", semantic: "positive", legDirection, text: prefix + (refund.penalty_amount
        ? `Refundable before departure with ${refund.penalty_currency || ""} ${refund.penalty_amount} penalty`.trim()
        : "Refundable before departure") });
  } else if (refund?.allowed === false) {
    parts.push({ category: "refund", semantic: "negative", legDirection, text: `${prefix}Not refundable before departure` });
  }

  if (change?.allowed === true) {
    parts.push({ category: "change", semantic: "positive", legDirection, text: prefix + (change.penalty_amount
        ? `Changes allowed with ${change.penalty_currency || ""} ${change.penalty_amount} penalty`.trim()
        : "Changes allowed before departure") });
  } else if (change?.allowed === false) {
    parts.push({ category: "change", semantic: "negative", legDirection, text: `${prefix}Changes not allowed before departure` });
  }
  return parts;
}

function buildMetasearchPartnerUrl() {
  return "";
}

function formatDuffelCabin(value?: string) {
  if (!value) return "";
  return value.replace(/_/g, " ");
}

function parseIsoDuration(value?: string) {
  if (!value) return 0;
  const match = value.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  return Number(match[1] || 0) * 60 + Number(match[2] || 0);
}

function estimateDuration(start?: string, end?: string) {
  if (!start || !end) return 0;
  const minutes = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 60000,
  );
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
}

function classifyLayover(minutes: number): Layover["quality"] {
  if (!minutes) return "unknown";
  if (minutes < 45) return "short";
  if (minutes <= 180) return "good";
  if (minutes >= 480) return "overnight";
  return "long";
}
