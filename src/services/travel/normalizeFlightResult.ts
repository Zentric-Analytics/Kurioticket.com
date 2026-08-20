import { nanoid } from "nanoid";
import type {
  FlightFareTerm,
  FlightLeg,
  FlightProviderCondition,
  FlightProviderDetails,
  FlightSearchParams,
  Layover,
  NormalizedFlightResult,
} from "@/lib/types";
import { minutesToDuration } from "@/lib/utils";
import { scoreFlight } from "@/services/travel/scoring";

type DuffelCarrier = {
  id?: string;
  name?: string;
  iata_code?: string;
  logo_symbol_url?: string | null;
  logo_lockup_url?: string | null;
  conditions_of_carriage_url?: string | null;
};

type DuffelPlace = {
  iata_code?: string;
  name?: string;
  city_name?: string;
  time_zone?: string;
};

type DuffelCabin = {
  name?: string;
  marketing_name?: string;
  amenities?: {
    wifi?: { available?: boolean | string | null; cost?: string | null };
    power?: { available?: boolean | string | null };
    seat?: { type?: string | null; pitch?: string | null; legroom?: string | null };
  };
};

type DuffelSegmentPassenger = {
  passenger_id?: string;
  cabin_class?: string;
  cabin_class_marketing_name?: string;
  fare_brand_name?: string;
  fare_basis_code?: string;
  cabin?: DuffelCabin;
  baggages?: Array<{ type?: string; quantity?: number }>;
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
    base_amount?: string;
    base_currency?: string;
    tax_amount?: string | null;
    tax_currency?: string | null;
    total_emissions_kg?: string | null;
    updated_at?: string;
    passenger_identity_documents_required?: boolean;
    supported_passenger_identity_document_types?: string[];
    supported_loyalty_programmes?: string[];
    available_services?: Array<{
      type?: string;
      total_amount?: string;
      total_currency?: string;
      maximum_quantity?: number;
      passenger_ids?: string[];
      segment_ids?: string[];
    }>;
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
        origin?: DuffelPlace;
        destination?: DuffelPlace;
        origin_terminal?: string | null;
        destination_terminal?: string | null;
        duration?: string;
        distance?: string | null;
        aircraft?: { name?: string; iata_code?: string } | null;
        stops?: Array<{
          duration?: string;
          departing_at?: string;
          arriving_at?: string;
          airport?: DuffelPlace;
        }>;
        operating_carrier?: DuffelCarrier;
        marketing_carrier?: DuffelCarrier;
        marketing_carrier_flight_number?: string;
        operating_carrier_flight_number?: string;
        passengers?: DuffelSegmentPassenger[];
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
  const airlineName = displayedCarrier?.name?.trim();
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
    providerDetails: buildDuffelProviderDetails(offer, price, currency),
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
  providerDetails?: FlightProviderDetails;
  price: number;
  currency: string;
  bookingUrl?: string;
  rawProviderReference?: unknown;
}): NormalizedFlightResult {
  const scores = scoreFlight(input);
  const partnerUrl = input.bookingUrl || buildMetasearchPartnerUrl();

  return {
    // Public result identity must never contain or be derived from a provider ID.
    id: `${input.provider.toLowerCase().replace(/\s+/g, "-")}-result-${nanoid(16)}`,
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
    providerDetails: input.providerDetails,
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
        id?: string;
        origin?: DuffelPlace;
        destination?: DuffelPlace;
        origin_terminal?: string | null;
        destination_terminal?: string | null;
        duration?: string;
        distance?: string | null;
        aircraft?: { name?: string; iata_code?: string } | null;
        stops?: Array<{ duration?: string; departing_at?: string; arriving_at?: string; airport?: DuffelPlace }>;
        operating_carrier?: DuffelCarrier;
        marketing_carrier?: DuffelCarrier;
        marketing_carrier_flight_number?: string;
        operating_carrier_flight_number?: string;
        passengers?: DuffelSegmentPassenger[];
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
              originDetails: airportDetails(segment.origin, segment.origin_terminal),
              destinationDetails: airportDetails(segment.destination, segment.destination_terminal),
              marketingCarrier: publicCarrier(segment.marketing_carrier),
              operatingCarrier: publicCarrier(segment.operating_carrier),
              marketingFlightNumber: flightNumber(segment.marketing_carrier?.iata_code, segment.marketing_carrier_flight_number),
              operatingFlightNumber: flightNumber(segment.operating_carrier?.iata_code, segment.operating_carrier_flight_number),
              aircraft: segment.aircraft ? {
                ...(clean(segment.aircraft.name) ? { name: clean(segment.aircraft.name) } : {}),
                ...(clean(segment.aircraft.iata_code) ? { iataCode: clean(segment.aircraft.iata_code)?.toUpperCase() } : {}),
              } : undefined,
              duration: providerDuration(segment.duration),
              ...(positiveNumber(segment.distance) !== undefined ? { distanceKm: positiveNumber(segment.distance) } : {}),
              technicalStops: (segment.stops ?? []).flatMap((stop) => {
                const airport = airportDetails(stop.airport);
                return airport ? [{ airport, duration: providerDuration(stop.duration), arrivalTime: clean(stop.arriving_at), departureTime: clean(stop.departing_at) }] : [];
              }),
              cabinDetails: uniqueCabinDetails(segment.passengers),
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

const clean = (value?: string | null) => value?.trim() || undefined;
const providerDuration = (value?: string | null) => {
  const minutes = parseIsoDuration(clean(value));
  return minutes ? minutesToDuration(minutes) : clean(value);
};
const providerState = (value?: boolean | string | null) =>
  value === true || value === "true" ? "included" as const
    : value === false || value === "false" ? "not-included" as const
      : "unknown" as const;

function airportDetails(place?: DuffelPlace, terminal?: string | null) {
  const iataCode = clean(place?.iata_code)?.toUpperCase();
  if (!iataCode) return undefined;
  return {
    iataCode,
    ...(clean(place?.name) ? { name: clean(place?.name) } : {}),
    ...(clean(place?.city_name) ? { cityName: clean(place?.city_name) } : {}),
    ...(clean(terminal) ? { terminal: clean(terminal) } : {}),
    ...(clean(place?.time_zone) ? { timeZone: clean(place?.time_zone) } : {}),
  };
}

function publicCarrier(carrier?: DuffelCarrier) {
  const name = clean(carrier?.name);
  if (!name) return undefined;
  const conditionsOfCarriageUrl = cleanPublicUrl(carrier?.conditions_of_carriage_url);
  return {
    name,
    ...(clean(carrier?.iata_code) ? { iataCode: clean(carrier?.iata_code)?.toUpperCase() } : {}),
    ...(conditionsOfCarriageUrl ? { conditionsOfCarriageUrl } : {}),
  };
}

function flightNumber(code?: string, number?: string) {
  const value = `${clean(code)?.toUpperCase() || ""}${clean(number) || ""}`;
  return value || undefined;
}

function uniqueCabinDetails(passengers?: DuffelSegmentPassenger[]) {
  const values = (passengers ?? []).map((passenger) => ({
    ...(clean(passenger.cabin_class) ? { cabinClass: clean(passenger.cabin_class) } : {}),
    ...(clean(passenger.cabin_class_marketing_name || passenger.cabin?.marketing_name) ? { cabinMarketingName: clean(passenger.cabin_class_marketing_name || passenger.cabin?.marketing_name) } : {}),
    ...(clean(passenger.fare_brand_name) ? { fareBrandName: clean(passenger.fare_brand_name) } : {}),
    ...(clean(passenger.fare_basis_code) ? { fareBasisCode: clean(passenger.fare_basis_code) } : {}),
    ...(passenger.cabin?.amenities ? { amenities: {
      ...(passenger.cabin.amenities.wifi ? { wifi: { state: providerState(passenger.cabin.amenities.wifi.available), ...(clean(passenger.cabin.amenities.wifi.cost) ? { cost: clean(passenger.cabin.amenities.wifi.cost) } : {}) } } : {}),
      ...(passenger.cabin.amenities.power ? { power: { state: providerState(passenger.cabin.amenities.power.available) } } : {}),
      ...(passenger.cabin.amenities.seat ? { seat: {
        ...(clean(passenger.cabin.amenities.seat.type) ? { type: clean(passenger.cabin.amenities.seat.type) } : {}),
        ...(clean(passenger.cabin.amenities.seat.pitch) ? { pitch: clean(passenger.cabin.amenities.seat.pitch) } : {}),
        ...(clean(passenger.cabin.amenities.seat.legroom) ? { legroom: clean(passenger.cabin.amenities.seat.legroom) } : {}),
      } } : {}),
    } } : {}),
  }));
  return [...new Map(values.filter((value) => Object.keys(value).length).map((value) => [JSON.stringify(value), value])).values()];
}

function money(value?: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function positiveNumber(value?: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function buildDuffelProviderDetails(offer: {
  base_amount?: string; base_currency?: string; tax_amount?: string | null; tax_currency?: string | null;
  total_emissions_kg?: string | null; updated_at?: string; passenger_identity_documents_required?: boolean;
  supported_passenger_identity_document_types?: string[]; supported_loyalty_programmes?: string[];
  owner?: DuffelCarrier;
  conditions?: DuffelConditions; slices?: Array<{ conditions?: DuffelConditions; segments?: Array<{ id?: string; origin?: DuffelPlace; destination?: DuffelPlace; marketing_carrier?: DuffelCarrier; marketing_carrier_flight_number?: string }> }>;
  available_services?: Array<{ type?: string; total_amount?: string; total_currency?: string; maximum_quantity?: number; passenger_ids?: string[]; segment_ids?: string[] }>;
}, totalAmount: number, totalCurrency: string): FlightProviderDetails {
  const segmentLabels = new Map((offer.slices ?? []).flatMap((slice) => (slice.segments ?? []).flatMap((segment) => segment.id ? [[segment.id, `${segment.origin?.iata_code || "?"} → ${segment.destination?.iata_code || "?"}${flightNumber(segment.marketing_carrier?.iata_code, segment.marketing_carrier_flight_number) ? ` · Flight ${flightNumber(segment.marketing_carrier?.iata_code, segment.marketing_carrier_flight_number)}` : ""}`] as const] : [])));
  const conditions = buildProviderConditions(offer);
  const ungroupedOptionalServices = (offer.available_services ?? []).flatMap((service) => {
    const price = money(service.total_amount);
    const currency = clean(service.total_currency)?.toUpperCase();
    if (!clean(service.type) || price === undefined || !currency || !/^[A-Z]{3}$/.test(currency)) return [];
    const contexts = (service.segment_ids ?? []).flatMap((id) => segmentLabels.get(id) ? [segmentLabels.get(id)!] : []);
    return [{ type: clean(service.type)!, description: service.type === "baggage" ? "Additional baggage available" : `${clean(service.type)} available`, price, currency, ...(Number.isInteger(service.maximum_quantity) ? { maximumQuantity: service.maximum_quantity } : {}), ...(service.passenger_ids?.length ? { travelerCount: service.passenger_ids.length } : {}), ...(contexts.length ? { journeyContext: [...new Set(contexts)].join(", ") } : {}), individuallyScoped: service.passenger_ids?.length === 1 }];
  });
  const groupedOptionalServices = new Map<string, typeof ungroupedOptionalServices>();
  for (const service of ungroupedOptionalServices) {
    const key = JSON.stringify([service.type, service.description, service.price, service.currency, service.maximumQuantity, service.journeyContext]);
    groupedOptionalServices.set(key, [...(groupedOptionalServices.get(key) ?? []), service]);
  }
  const optionalServices = [...groupedOptionalServices.values()].map((members) => {
    const first = members[0];
    const travelerCount = members.reduce((total, service) => total + (service.travelerCount ?? 0), 0);
    return {
      type: first.type,
      description: first.description,
      price: first.price,
      currency: first.currency,
      ...(first.maximumQuantity !== undefined ? { maximumQuantity: first.maximumQuantity } : {}),
      ...(travelerCount ? { travelerCount } : {}),
      ...(first.journeyContext ? { journeyContext: first.journeyContext } : {}),
      ...(members.length > 1 && members.every(({ individuallyScoped }) => individuallyScoped) ? { pricedPerTraveler: true } : {}),
    };
  });
  const ownerName = clean(offer.owner?.name);
  const conditionsOfCarriageUrl = cleanPublicUrl(offer.owner?.conditions_of_carriage_url);
  return {
    ...(ownerName ? { offerOwner: {
      name: ownerName,
      ...(clean(offer.owner?.iata_code) ? { iataCode: clean(offer.owner?.iata_code)?.toUpperCase() } : {}),
      ...(conditionsOfCarriageUrl ? { conditionsOfCarriageUrl } : {}),
    } } : {}),
    price: {
      ...(money(offer.base_amount) !== undefined ? { baseAmount: money(offer.base_amount) } : {}),
      ...(clean(offer.base_currency) ? { baseCurrency: clean(offer.base_currency)?.toUpperCase() } : {}),
      ...(money(offer.tax_amount) !== undefined ? { taxAmount: money(offer.tax_amount) } : {}),
      ...(clean(offer.tax_currency) ? { taxCurrency: clean(offer.tax_currency)?.toUpperCase() } : {}),
      totalAmount, totalCurrency,
    },
    ...(money(offer.total_emissions_kg) !== undefined ? { totalEmissionsKg: money(offer.total_emissions_kg) } : {}),
    ...(clean(offer.updated_at) ? { updatedAt: clean(offer.updated_at) } : {}),
    ...(typeof offer.passenger_identity_documents_required === "boolean" ? { passengerIdentityDocumentsRequired: offer.passenger_identity_documents_required } : {}),
    ...(offer.supported_passenger_identity_document_types?.length ? { supportedIdentityDocumentTypes: offer.supported_passenger_identity_document_types.map((value) => value.trim()).filter(Boolean) } : {}),
    ...(offer.supported_loyalty_programmes?.length ? { supportedLoyaltyProgrammes: offer.supported_loyalty_programmes.map((value) => value.trim().toUpperCase()).filter(Boolean) } : {}),
    ...(conditions.length ? { conditions } : {}),
    ...(optionalServices.length ? { optionalServices } : {}),
  };
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
  priority_check_in?: boolean | string | null;
  priority_boarding?: boolean | string | null;
  advance_seat_selection?: boolean | string | null;
};

function buildProviderConditions(offer: { conditions?: DuffelConditions; slices?: Array<{ conditions?: DuffelConditions }> }) {
  const result: FlightProviderCondition[] = [];
  const append = (conditions: DuffelConditions | undefined, scope: FlightProviderCondition["scope"]) => {
    for (const [category, condition] of [["change", conditions?.change_before_departure], ["refund", conditions?.refund_before_departure]] as const) {
      if (!condition) continue;
      const amount = money(condition.penalty_amount);
      result.push({ category, scope, state: condition.allowed === true ? "allowed" : condition.allowed === false ? "not-allowed" : "unknown", ...(amount !== undefined ? { penaltyAmount: amount } : {}), ...(clean(condition.penalty_currency) ? { penaltyCurrency: clean(condition.penalty_currency)?.toUpperCase() } : {}) });
    }
    for (const [category, value] of [["priority-check-in", conditions?.priority_check_in], ["priority-boarding", conditions?.priority_boarding], ["advance-seat-selection", conditions?.advance_seat_selection]] as const) {
      if (value === undefined) continue;
      result.push({ category, scope, state: value === true || value === "true" ? "allowed" : value === false || value === "false" ? "not-allowed" : "unknown" });
    }
  };
  append(offer.conditions, "trip");
  (offer.slices ?? []).forEach((slice, index) => append(slice.conditions, index === 0 ? "outbound" : index === 1 ? "return" : "leg"));
  return result;
}

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
