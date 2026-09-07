import type { FlightDetailsOffer, FlightDetailsSuccess } from "../../../../../src/lib/flights/flightDetailsContract";
import { flightDetailsRouteLabel } from "../../../../../src/lib/flights/flightDetailsContract";
import type { FlightCabinDetails, FlightFareTerm, FlightLeg, FlightProviderCondition, FlightSegment, TripType } from "../../../../../src/lib/types";

type RouteValue = string | string[] | undefined;

export function nativeFlightDetailsRoute(details: FlightDetailsSuccess) {
  const legs = details.flight.legs ?? [];
  return flightDetailsRouteLabel(
    details.search.tripType,
    legs,
    details.flight.originAirport,
    details.flight.destinationAirport,
  );
}

export function nativeFlightEditSearchParams(
  details: FlightDetailsSuccess,
  incoming: Record<string, RouteValue>,
) {
  const { search } = details;
  const result: Record<string, string> = {
    tripType: search.tripType,
    origin: search.legs[0]?.origin ?? details.flight.originAirport,
    destination: search.legs.at(-1)?.destination ?? details.flight.destinationAirport,
    departureDate: search.departureDate,
    adults: String(search.adults),
    children: String(search.children),
    infants: String(search.infants),
    travelers: String(search.travelers),
    cabin: search.cabinClass,
  };
  if (search.returnDate) result.returnDate = search.returnDate;
  const incomingCurrency = first(incoming.currency).trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(incomingCurrency)) result.currency = incomingCurrency;
  if (search.tripType === "multi-city") {
    result.legCount = String(search.legs.length);
    search.legs.forEach((leg, index) => {
      const number = index + 1;
      result[`origin${number}`] = leg.origin;
      result[`destination${number}`] = leg.destination;
      result[`departureDate${number}`] = leg.departureDate;
    });
  }
  return result;
}

export function nativeCompactFareTerms(terms: FlightFareTerm[], tripType: TripType) {
  const rows = terms.flatMap((term, index) =>
    buildFareDisplayRows(term, tripType).map((text, rowIndex) => ({ term, index, rowIndex, text })),
  );
  const conciseRows = tripType === "round-trip" ? consolidateMatchingRoundTripBaggage(rows) : rows;
  return conciseRows
    .sort((left, right) => {
      const priorityDifference = fareTermSelectionPriority(left.term) - fareTermSelectionPriority(right.term);
      return priorityDifference || fareDisplayRowPriority(left.term, left.text) - fareDisplayRowPriority(right.term, right.text) || left.index - right.index || left.rowIndex - right.rowIndex;
    })
    .slice(0, 3)
    .sort((left, right) => {
      const priorityDifference = fareDisplayRowPriority(left.term, left.text) - fareDisplayRowPriority(right.term, right.text);
      return priorityDifference || left.index - right.index || left.rowIndex - right.rowIndex;
    });
}

type FareDisplayRow = { term: FlightFareTerm; index: number; rowIndex: number; text: string };

function consolidateMatchingRoundTripBaggage(rows: FareDisplayRow[]) {
  const consumed = new Set<number>();
  return rows.flatMap((row, rowPosition) => {
    if (consumed.has(rowPosition)) return [];
    const baggage = parseScopedIncludedBaggage(row);
    if (!baggage || baggage.scope !== "outbound") return [row];
    const returnPosition = rows.findIndex((candidate, candidatePosition) => {
      if (candidatePosition === rowPosition || consumed.has(candidatePosition)) return false;
      const candidateBaggage = parseScopedIncludedBaggage(candidate);
      return candidateBaggage?.scope === "return" && candidateBaggage.fact === baggage.fact;
    });
    if (returnPosition < 0) return [row];
    consumed.add(returnPosition);
    return [{ ...row, text: `${baggage.displayText} each way` }];
  });
}

function parseScopedIncludedBaggage(row: FareDisplayRow) {
  if (row.term.category !== "baggage") return null;
  const match = row.text.match(/^(Outbound|Return):\s*(\d+\s+(?:carry-ons?|checked bags?)\s+included)$/i);
  if (!match) return null;
  return { scope: match[1].toLocaleLowerCase("en-US"), fact: match[2].toLocaleLowerCase("en-US"), displayText: match[2] };
}

export function buildFareDisplayRows(term: FlightFareTerm, tripType: TripType) {
  const text = tripType === "one-way" ? term.text.replace(/^Outbound:\s*/i, "") : term.text;
  if (term.category !== "baggage") return [text];
  const scopeMatch = text.match(/^(Outbound|Return|Flight \d+):\s*(.+)$/i);
  const scope = scopeMatch?.[1];
  const baggageText = scopeMatch?.[2] ?? text;
  const clauses = baggageText.split(/,\s*/);
  if (clauses.length !== 2) return [text];
  const recognized = clauses.map((clause) => {
    const match = clause.match(/^(\d+)\s+(carry-ons?|checked bags?)\s+included$/i);
    if (!match) return null;
    return { kind: match[2].toLowerCase().startsWith("carry") ? "carry-on" : "checked-bag", text: clause } as const;
  });
  if (recognized.some((clause) => clause === null) || new Set(recognized.map((clause) => clause?.kind)).size !== 2) return [text];
  return recognized
    .filter((clause): clause is NonNullable<typeof clause> => clause !== null)
    .sort((left, right) => left.kind === right.kind ? 0 : left.kind === "carry-on" ? -1 : 1)
    .map((clause) => scope ? `${scope}: ${clause.text}` : clause.text);
}

function fareTermSelectionPriority(term: FlightFareTerm) {
  if (term.semantic === "negative" && (term.category === "change" || term.category === "refund")) return 0;
  if (term.semantic === "negative") return 1;
  if (term.category === "baggage") return 2;
  if (term.category === "change" || term.category === "refund") return 3;
  return 4;
}

function fareDisplayRowPriority(term: FlightFareTerm, text: string) {
  if (term.category === "baggage" && /\bcarry-ons?\b/i.test(text)) return 0;
  if (term.category === "baggage" && /\bchecked bags?\b/i.test(text)) return 1;
  if (term.semantic === "negative" && (term.category === "change" || term.category === "refund")) return 2;
  if (term.semantic === "negative") return 3;
  if (term.category === "change" || term.category === "refund") return 4;
  if (term.category === "baggage") return 5;
  return 6;
}

export function nativeConditionLabel(condition: FlightProviderCondition) {
  const scope = condition.scope === "trip"
    ? "Whole trip"
    : condition.legIndex !== undefined
      ? `Flight ${condition.legIndex + 1}`
      : condition.scope === "outbound"
        ? "Outbound only"
        : condition.scope === "return"
          ? "Return only"
          : "Leg";
  const category = condition.category === "change" ? "Changes" : titleCase(condition.category);
  const permission = condition.category === "change" || condition.category === "refund";
  const state = condition.state === "allowed"
    ? permission ? "Allowed" : "Included"
    : condition.state === "not-allowed"
      ? permission ? "Not allowed" : "Not included"
      : "Not supplied by provider";
  return `${scope} · ${category}: ${state}`;
}

export function nativeCarrierConditionsLinks(offer: FlightDetailsOffer) {
  const entries = (offer.legs ?? [])
    .flatMap((leg) => leg.segments.flatMap((segment) => [segment.marketingCarrier, segment.operatingCarrier]))
    .flatMap((carrier) => carrier?.conditionsOfCarriageUrl ? [{ name: carrier.name, url: carrier.conditionsOfCarriageUrl }] : []);
  if (offer.providerDetails?.offerOwner?.conditionsOfCarriageUrl) {
    entries.push({ name: offer.providerDetails.offerOwner.name, url: offer.providerDetails.offerOwner.conditionsOfCarriageUrl });
  }
  return [...new Map(entries.filter((entry) => /^https?:\/\//i.test(entry.url)).map((entry) => [entry.url, entry])).values()];
}

export function nativeSegmentCarrierName(segment: FlightSegment, fallback: string) {
  return segment.airlineName?.trim() || segment.marketingCarrier?.name.trim() || fallback.trim() || "Carrier not supplied";
}

export function nativeCanUseOfferAirlineLogo(segment: FlightSegment, offerAirlineName: string, offerAirlineLogo?: string | null) {
  if (!offerAirlineLogo) return false;
  return nativeSegmentCarrierName(segment, offerAirlineName).toLocaleLowerCase("en-US") === offerAirlineName.trim().toLocaleLowerCase("en-US");
}

export function nativeAmenityLines(cabin: FlightCabinDetails) {
  const lines: string[] = [];
  if (cabin.amenities?.wifi) {
    lines.push(`Wi-Fi: ${cabin.amenities.wifi.state === "included" ? cabin.amenities.wifi.cost ? `Available (${titleCase(cabin.amenities.wifi.cost)})` : "Available" : cabin.amenities.wifi.state === "not-included" ? "Not available" : "Not supplied by provider"}`);
  }
  if (cabin.amenities?.power) {
    lines.push(`Power: ${cabin.amenities.power.state === "included" ? "Available" : cabin.amenities.power.state === "not-included" ? "Not available" : "Not supplied by provider"}`);
  }
  if (cabin.amenities?.seat) {
    const seat = [
      cabin.amenities.seat.type && titleCase(cabin.amenities.seat.type),
      cabin.amenities.seat.pitch && `${cabin.amenities.seat.pitch} in pitch`,
      cabin.amenities.seat.legroom && `${cabin.amenities.seat.legroom.toUpperCase() === "N/A" ? "N/A" : titleCase(cabin.amenities.seat.legroom)} legroom`,
    ].filter(Boolean).join(", ");
    if (seat) lines.push(`Seat: ${seat}`);
  }
  return lines;
}

export function nativeTechnicalStopCount(leg: FlightLeg) {
  return leg.segments.reduce((total, segment) => total + (segment.technicalStops?.length ?? 0), 0);
}

export function nativeStopsLabel(connections: number, technicalStops = 0) {
  const parts: string[] = [];
  if (connections) parts.push(`${connections} ${connections === 1 ? "stop" : "stops"}`);
  else parts.push("Nonstop");
  if (technicalStops) parts.push(`${technicalStops} technical ${technicalStops === 1 ? "stop" : "stops"}`);
  return parts.join(" · ");
}

export function nativeFormatDate(value: string, locale: string) {
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(date);
  } catch {
    return value.slice(0, 10);
  }
}

export function nativeFormatTime(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(date);
  } catch {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }
}

export function nativeFormatSourceMoney(amount: number, currency: string, locale: string) {
  const normalized = currency.toUpperCase();
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: normalized, currencyDisplay: "code" }).format(amount);
  } catch {
    return `${normalized} ${Number.isFinite(amount) ? amount.toFixed(2) : String(amount)}`;
  }
}

export function nativeFormatProviderTimestamp(value: string, locale: string) {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return value;
  try {
    return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(timestamp);
  } catch {
    return value;
  }
}

export function nativeFormatDistanceKm(distanceKm: number, locale: string) {
  try {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: distanceKm >= 100 ? 0 : 1 }).format(distanceKm)} km`;
  } catch {
    return `${distanceKm >= 100 ? Math.round(distanceKm) : Math.round(distanceKm * 10) / 10} km`;
  }
}

export function titleCase(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function first(value: RouteValue) {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}
