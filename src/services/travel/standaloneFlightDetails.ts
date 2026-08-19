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
  return !offer.cabinClass || canonical(offer.cabinClass) === canonical(search.cabinClass);
}

function materialKey(offer: NormalizedFlightResult) {
  return [
    canonical(offer.fareBrandName || ""),
    canonical(offer.cabinClass || ""),
    canonical(offer.baggageInfo || ""),
    canonical(offer.refundInfo || ""),
  ].join("|");
}

function fareTerms(offer: NormalizedFlightResult) {
  return [offer.baggageInfo, offer.refundInfo]
    .map((term) => term.trim())
    .filter(Boolean);
}

function fareLabel(offer: NormalizedFlightResult) {
  return offer.fareBrandName?.trim() || titleCase(offer.cabinClass || "Fare");
}

export function buildMaterialFareChoices(
  offers: NormalizedFlightResult[],
): Array<{
  source: NormalizedFlightResult;
  memberProviderOfferIds: string[];
  choice: FlightDetailsFareChoice;
}> {
  const groups = new Map<string, NormalizedFlightResult[]>();
  for (const offer of offers) {
    const key = materialKey(offer);
    groups.set(key, [...(groups.get(key) ?? []), offer]);
  }
  return [...groups.entries()]
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
}

export async function buildStandaloneFlightDetails({
  cachedSelected,
  cachedAlternatives,
  search,
  now = Date.now(),
  refresh = refreshExactFlightOffer,
}: {
  cachedSelected: NormalizedFlightResult;
  cachedAlternatives: NormalizedFlightResult[];
  search: FlightSearchParams;
  now?: number;
  refresh?: RefreshExactFlightOffer;
}): Promise<FlightDetailsSuccess | { status: "unavailable"; error: string }> {
  if (!isFlightProviderOfferUsableAt(cachedSelected, now))
    return { status: "unavailable", error: unavailableMessage };
  const selected = await refresh({ cachedOffer: cachedSelected, search, now });
  if (!selected.offer || !validatesSearchContext(selected.offer, search))
    return { status: "unavailable", error: unavailableMessage };

  const selectedOffer = selected.offer;
  const selectedIdentity = itineraryIdentity(selectedOffer);
  const alternativeResults = await Promise.all(
    cachedAlternatives
      .filter((offer) => offer.id !== cachedSelected.id)
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
  const fareChoices = buildMaterialFareChoices(refreshedOffers);
  const initial =
    fareChoices.find(({ memberProviderOfferIds }) =>
      selectedOffer.providerOfferId &&
      memberProviderOfferIds.includes(selectedOffer.providerOfferId),
    ) ??
    fareChoices[0];
  if (!initial) return { status: "unavailable", error: unavailableMessage };
  rememberFlights(refreshedOffers, now);
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
