import type { FlightResult } from "../../api/travelApi";

export type FlightOperatingCarrierPresentation = {
  text: string;
  accessibilityText: string;
} | null;

type Carrier = NonNullable<NonNullable<FlightResult["legs"]>[number]["segments"]>[number]["operatingCarrier"];

function normalized(value: string | undefined) {
  const normalizedValue = value?.trim().toLocaleLowerCase();
  return normalizedValue || null;
}

function sameCarrier(marketing: NonNullable<Carrier>, operating: NonNullable<Carrier>) {
  const marketingIata = normalized(marketing.iataCode);
  const operatingIata = normalized(operating.iataCode);
  if (marketingIata && operatingIata) return marketingIata === operatingIata;
  return normalized(marketing.name) === normalized(operating.name);
}

function operatorIdentity(carrier: NonNullable<Carrier>) {
  return normalized(carrier.iataCode) ?? normalized(carrier.name);
}

/** Derives compact copy only from provider-authored carrier facts on every segment. */
export function flightOperatingCarrierPresentation(result: FlightResult): FlightOperatingCarrierPresentation {
  const segments = result.legs?.flatMap((leg) => leg.segments ?? []) ?? [];
  if (segments.length === 0) return null;

  const eligible = segments.map((segment) => {
    const marketing = segment.marketingCarrier;
    const operating = segment.operatingCarrier;
    if (!normalized(marketing?.name) || !normalized(operating?.name)) return null;
    return { operating: operating!, differs: !sameCarrier(marketing!, operating!) };
  });

  // Incomplete provider facts cannot support an itinerary-level statement.
  if (eligible.some((segment) => segment === null)) return null;
  const differing = eligible.filter((segment) => segment?.differs);
  if (differing.length === 0) return null;

  const operators = new Map<string, string>();
  for (const segment of differing) {
    const carrier = segment!.operating;
    const identity = operatorIdentity(carrier);
    if (!identity) return null;
    operators.set(identity, carrier.name.trim());
  }

  if (operators.size > 1) {
    return {
      text: "Includes partner-operated flights",
      accessibilityText: "includes partner-operated flights",
    };
  }

  const operatorName = operators.values().next().value;
  if (!operatorName) return null;
  const allPartnerOperated = differing.length === segments.length;
  return allPartnerOperated
    ? { text: `Operated by ${operatorName}`, accessibilityText: `operated by ${operatorName}` }
    : { text: `Includes flight operated by ${operatorName}`, accessibilityText: `includes flight operated by ${operatorName}` };
}
