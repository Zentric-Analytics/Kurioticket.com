import { createHash } from "node:crypto";

import type {
  FlightDetailsFareChoice,
  FlightDetailsSuccess,
} from "@/lib/flights/flightDetailsContract";
import { rememberFlights, toFlightDetailsOffer } from "@/lib/searchCache";
import type {
  CabinClass,
  FlightSearchParams,
  NormalizedFlightResult,
  ProviderResult,
} from "@/lib/types";
import {
  buildFlightItineraryKey,
  isFlightProviderOfferUsableAt,
} from "./flightOfferInventory";
import {
  refreshExactFlightOffer,
  type RefreshExactFlightOffer,
} from "./flightOfferRevalidation";
import { resolveFlightHandoff } from "./flightHandoff";
import { getDuffelFlightUpsellOffers } from "./providers/duffelProvider";

const unavailableMessage =
  "This flight quote is no longer available. Please search again for current prices.";

const cabins = new Set<CabinClass>([
  "economy",
  "premium-economy",
  "business",
  "first",
]);

export function parseFlightDetailsSearch(
  params: URLSearchParams,
): FlightSearchParams | null {
  const tripType = params.get("tripType");
  const origin = params.get("origin")?.trim().toUpperCase() || "";
  const destination = params.get("destination")?.trim().toUpperCase() || "";
  const departureDate = params.get("departureDate")?.trim() || "";
  const returnDate = params.get("returnDate")?.trim() || undefined;
  const cabinClass = params.get("cabinClass") as CabinClass | null;
  const adults = strictCount(params.get("adults"), 1);
  const children = strictCount(params.get("children"), 0);
  const infants = strictCount(params.get("infants"), 0);
  if (
    (tripType !== "one-way" && tripType !== "round-trip") ||
    !/^[A-Z0-9]{3}$/.test(origin) ||
    !/^[A-Z0-9]{3}$/.test(destination) ||
    origin === destination ||
    !isDate(departureDate) ||
    (tripType === "round-trip" && (!returnDate || !isDate(returnDate))) ||
    !cabinClass ||
    !cabins.has(cabinClass) ||
    adults === null ||
    children === null ||
    infants === null ||
    adults < 1 ||
    infants > adults
  ) return null;
  return {
    tripType,
    origin,
    destination,
    departureDate,
    ...(tripType === "round-trip" ? { returnDate } : {}),
    adults,
    children,
    infants,
    travelers: adults + children + infants,
    cabinClass,
    ...(params.get("currency")?.trim()
      ? { currency: params.get("currency")!.trim().toUpperCase() }
      : {}),
  };
}

/** Reconstructs only provider-refresh context from the server-owned cached offer. */
export function deriveFlightSearchFromOffer(
  offer: NormalizedFlightResult,
): FlightSearchParams | null {
  const legs = offer.legs ?? [];
  const outbound = legs[0];
  const returnLeg = legs[1];
  if (!outbound || (legs.length !== 1 && legs.length !== 2)) return null;
  const cabin = canonical(offer.cabinClass).replace(/ /g, "-") as CabinClass;
  if (!cabins.has(cabin)) return null;
  return {
    tripType: legs.length === 2 ? "round-trip" : "one-way",
    origin: outbound.originAirport.toUpperCase(),
    destination: outbound.destinationAirport.toUpperCase(),
    departureDate: outbound.departureTime.slice(0, 10),
    ...(returnLeg ? { returnDate: returnLeg.departureTime.slice(0, 10) } : {}),
    adults: 1,
    children: 0,
    infants: 0,
    travelers: 1,
    cabinClass: cabin,
    currency: offer.currency,
  };
}

function strictCount(value: string | null, fallback: number) {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) return null;
  const count = Number(value);
  return Number.isSafeInteger(count) && count <= 9 ? count : null;
}

function isDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
}

const canonical = (value: string) =>
  value.trim().toLowerCase().replace(/[-_\s]+/g, " ");

function itineraryIdentity(offer: NormalizedFlightResult) {
  return (offer.legs ?? []).map(buildFlightItineraryKey).join("|");
}

export function validatesSearchContext(
  offer: NormalizedFlightResult,
  search: FlightSearchParams,
  { allowDifferentCabin = false }: { allowDifferentCabin?: boolean } = {},
) {
  const legs = offer.legs ?? [];
  const expectedCount = search.tripType === "round-trip" ? 2 : 1;
  if (
    legs.length !== expectedCount ||
    legs[0]?.direction !== "outbound" ||
    (expectedCount === 2 && legs[1]?.direction !== "return") ||
    legs[0]?.originAirport.toUpperCase() !== search.origin ||
    legs[0]?.destinationAirport.toUpperCase() !== search.destination ||
    legs[0]?.departureTime.slice(0, 10) !== search.departureDate ||
    (expectedCount === 2 &&
      (legs[1]?.originAirport.toUpperCase() !== search.destination ||
        legs[1]?.destinationAirport.toUpperCase() !== search.origin ||
        legs[1]?.departureTime.slice(0, 10) !== search.returnDate)) ||
    !Number.isFinite(offer.price) ||
    offer.price <= 0 ||
    !/^[A-Z]{3}$/.test(offer.currency)
  ) return false;
  return allowDifferentCabin || !offer.cabinClass || canonical(offer.cabinClass) === canonical(search.cabinClass);
}

function providerBrandIdentity(offer: NormalizedFlightResult) {
  const legBrands = (offer.legs ?? []).map((leg) => leg.fareBrandName?.trim() || "");
  return legBrands.some(Boolean) ? legBrands.map((brand) => canonical(brand) || "unbranded").join("/") : canonical(offer.fareBrandName || "");
}

function materialKey(offer: NormalizedFlightResult, upsellOfferIds: ReadonlySet<string>) {
  const providerBrand = providerBrandIdentity(offer);
  if (providerBrand)
    return ["provider-brand", canonical(offer.provider), providerBrand, canonical(offer.cabinClass)].join("|");
  if (offer.providerOfferId && upsellOfferIds.has(offer.providerOfferId))
    return ["provider-upsell-cabin", canonical(offer.provider), canonical(offer.cabinClass)].join("|");
  return ["exact-offer", canonical(offer.provider), offer.providerOfferId || offer.id].join("|");
}

function fareTerms(offer: NormalizedFlightResult) {
  return offer.fareTerms?.length ? offer.fareTerms : [
    { category: "baggage" as const, semantic: offer.baggageInfo.toLowerCase().includes("included") ? "positive" as const : "informational" as const, text: offer.baggageInfo },
    { category: "refund" as const, semantic: /not refundable|not allowed/i.test(offer.refundInfo) ? "negative" as const : /not supplied/i.test(offer.refundInfo) ? "informational" as const : "positive" as const, text: offer.refundInfo },
  ].filter(({ text }) => text.trim());
}

function fareLabel(offer: NormalizedFlightResult) {
  const legBrands = (offer.legs ?? []).map((leg) => leg.fareBrandName?.trim()).filter(Boolean) as string[];
  const unique = [...new Set(legBrands)];
  return unique.length > 1 ? legBrands.join(" / ") : unique[0] || offer.fareBrandName?.trim() || titleCase(offer.cabinClass || "Fare");
}

export function buildMaterialFareChoices(
  offers: NormalizedFlightResult[],
  { upsellOfferIds = new Set<string>(), selectedProviderOfferId }: { upsellOfferIds?: ReadonlySet<string>; selectedProviderOfferId?: string } = {},
): Array<{
  source: NormalizedFlightResult;
  memberProviderOfferIds: string[];
  choice: FlightDetailsFareChoice;
}> {
  const groups = new Map<string, NormalizedFlightResult[]>();
  for (const offer of offers) {
    const key = materialKey(offer, upsellOfferIds);
    groups.set(key, [...(groups.get(key) ?? []), offer]);
  }
  const choices = [...groups.entries()]
    .map(([key, group]) => {
      const source = group.reduce((lowest, candidate) =>
        candidate.price < lowest.price ? candidate : lowest,
      );
      const handoff = resolveFlightHandoff(source);
      const choice: FlightDetailsFareChoice = {
        key: `fare-${createHash("sha256").update(key).digest("base64url").slice(0, 16)}`,
        label: fareLabel(source),
        offer: toFlightDetailsOffer(source),
        distinguishingTerms: fareTerms(source),
        selectedOffer: Boolean(selectedProviderOfferId && group.some((offer) => offer.providerOfferId === selectedProviderOfferId)),
        handoff: handoff
          ? { available: true, providerName: handoff.providerName }
          : { available: false },
      };
      return {
        source,
        memberProviderOfferIds: group.flatMap(({ providerOfferId }) =>
          providerOfferId ? [providerOfferId] : [],
        ),
        choice,
      };
    })
    .sort((left, right) => left.source.price - right.source.price);
  if (choices.length > 1) {
    const comparableFacts = new Set(choices.map(({ source }) => JSON.stringify({
      cabinClass: canonical(source.cabinClass),
      terms: source.fareTerms,
      cabinDetails: source.legs?.map((leg) => leg.segments.map((segment) => segment.cabinDetails)),
      conditions: source.providerDetails?.conditions,
    })));
    if (comparableFacts.size === 1) {
      for (const { choice } of choices) choice.distinguishingTerms.push({
        category: "fare",
        semantic: "informational",
        text: "No additional comparable fare benefits were supplied by the provider.",
      });
    }
  }
  return choices;
}

export async function buildStandaloneFlightDetails({
  cachedSelected,
  cachedAlternatives,
  search,
  now = Date.now(),
  refresh = refreshExactFlightOffer,
  discoverUpsells = getDuffelFlightUpsellOffers,
}: {
  cachedSelected: NormalizedFlightResult;
  cachedAlternatives: NormalizedFlightResult[];
  search: FlightSearchParams;
  now?: number;
  refresh?: RefreshExactFlightOffer;
  discoverUpsells?: (providerOfferId: string, search: FlightSearchParams) => Promise<ProviderResult<NormalizedFlightResult>>;
}): Promise<FlightDetailsSuccess | { status: "unavailable"; error: string }> {
  if (!isFlightProviderOfferUsableAt(cachedSelected, now))
    return { status: "unavailable", error: unavailableMessage };
  const selected = await refresh({ cachedOffer: cachedSelected, search, now });
  if (!selected.offer || !validatesSearchContext(selected.offer, search))
    return { status: "unavailable", error: unavailableMessage };

  const selectedOffer = selected.offer;
  const selectedIdentity = itineraryIdentity(selectedOffer);
  const upsellResponse = selectedOffer.providerOfferId
    ? await discoverUpsells(selectedOffer.providerOfferId, search)
    : null;
  const upsells = (upsellResponse?.status === "success" ? upsellResponse.results : []).filter((offer) =>
    offer.provider.trim().toLowerCase() === selectedOffer.provider.trim().toLowerCase() &&
    validatesSearchContext(offer, search, { allowDifferentCabin: true }) &&
    offer.currency === selectedOffer.currency &&
    Boolean(offer.providerExpiresAt && offer.providerExpiresAt > now) &&
    Boolean(offer.providerOfferId) &&
    itineraryIdentity(offer) === selectedIdentity,
  );
  const alternativeResults = await Promise.all(
    cachedAlternatives
      .filter((offer) => offer.id !== cachedSelected.id)
      .filter((offer) => providerBrandIdentity(offer))
      .slice(0, 4)
      .map((cachedOffer) => refresh({ cachedOffer, search, now })),
  );
  const refreshedOffers = [
    selectedOffer,
    ...alternativeResults.flatMap((result) =>
      result.offer &&
      validatesSearchContext(result.offer, search) &&
      result.offer.currency === selectedOffer.currency &&
      itineraryIdentity(result.offer) === selectedIdentity
        ? [result.offer]
        : [],
    ),
  ];
  const cachedFareOffers = [
    selectedOffer,
    ...refreshedOffers.slice(1).filter((offer) => providerBrandIdentity(offer)),
  ];
  const upsellOfferIds = new Set(upsells.flatMap(({ providerOfferId }) => providerOfferId ? [providerOfferId] : []));
  const fareChoices = buildMaterialFareChoices(
    [selectedOffer, ...upsells, ...cachedFareOffers.slice(1)],
    { upsellOfferIds, selectedProviderOfferId: selectedOffer.providerOfferId },
  );
  const initial =
    fareChoices.find(({ choice }) => choice.selectedOffer) ??
    fareChoices[0];
  if (!initial) return { status: "unavailable", error: unavailableMessage };
  rememberFlights([selectedOffer, ...upsells, ...refreshedOffers.slice(1)], now, search);
  console.info("[flight-details:fare-discovery]", {
    upsellAttempted: Boolean(selectedOffer.providerOfferId),
    providerStatusCategory: upsellResponse?.errorCategory ?? upsellResponse?.status ?? "not_attempted",
    providerLatencyMs: upsellResponse?.latencyMs ?? 0,
    returnedUpsellCount: upsellResponse?.status === "success" ? upsellResponse.results.length : 0,
    normalizedUpsellCount: upsellResponse?.status === "success" ? upsellResponse.results.length : 0,
    sameItineraryEligibleCount: upsells.length,
    finalFareChoiceCount: fareChoices.length,
    missingFareBrandCount: [selectedOffer, ...upsells].filter((offer) => !providerBrandIdentity(offer)).length,
    missingBaggageCount: [selectedOffer, ...upsells].filter((offer) => /not supplied/i.test(offer.baggageInfo)).length,
    missingConditionsCount: [selectedOffer, ...upsells].filter((offer) => /not supplied/i.test(offer.refundInfo)).length,
    carrierNamesPresentCount: [selectedOffer, ...upsells].filter((offer) => offer.legs?.some((leg) => leg.segments.some((segment) => segment.marketingCarrier?.name))).length,
    operatingCarrierPresentCount: [selectedOffer, ...upsells].filter((offer) => offer.legs?.some((leg) => leg.segments.some((segment) => segment.operatingCarrier?.name))).length,
    airportDetailsPresentCount: [selectedOffer, ...upsells].filter((offer) => offer.legs?.some((leg) => leg.segments.some((segment) => segment.originDetails?.name || segment.destinationDetails?.name))).length,
    terminalDataPresentCount: [selectedOffer, ...upsells].filter((offer) => offer.legs?.some((leg) => leg.segments.some((segment) => segment.originDetails?.terminal || segment.destinationDetails?.terminal))).length,
    aircraftDataPresentCount: [selectedOffer, ...upsells].filter((offer) => offer.legs?.some((leg) => leg.segments.some((segment) => segment.aircraft))).length,
    technicalStopsPresentCount: [selectedOffer, ...upsells].filter((offer) => offer.legs?.some((leg) => leg.segments.some((segment) => segment.technicalStops?.length))).length,
    cabinAmenitiesPresentCount: [selectedOffer, ...upsells].filter((offer) => offer.legs?.some((leg) => leg.segments.some((segment) => segment.cabinDetails?.some((cabin) => cabin.amenities)))).length,
    priceBreakdownPresentCount: [selectedOffer, ...upsells].filter((offer) => offer.providerDetails?.price?.baseAmount !== undefined || offer.providerDetails?.price?.taxAmount !== undefined).length,
    emissionsPresentCount: [selectedOffer, ...upsells].filter((offer) => offer.providerDetails?.totalEmissionsKg !== undefined).length,
    optionalServicesPresentCount: [selectedOffer, ...upsells].filter((offer) => offer.providerDetails?.optionalServices?.length).length,
  });
  const handoff = resolveFlightHandoff(initial.source);
  return {
    status: "available",
    flight: initial.choice.offer,
    fareChoices: fareChoices.map(({ choice }) => choice),
    handoff: handoff
      ? { available: true, providerName: handoff.providerName }
      : { available: false },
    revalidation: { status: selected.status === "changed" ? "changed" : "confirmed" },
    search: {
      tripType: search.tripType === "round-trip" ? "round-trip" : "one-way",
      departureDate: search.departureDate,
      ...(search.returnDate ? { returnDate: search.returnDate } : {}),
      adults: search.adults,
      children: search.children,
      infants: search.infants,
      travelers: search.travelers,
    },
  };
}

function titleCase(value: string) {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
