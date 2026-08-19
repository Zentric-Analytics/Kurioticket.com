import type { PublicFlightResult } from "@/lib/types";

export type FareGroup = {
  key: string;
  label: string;
  offers: PublicFlightResult[];
  lowest: PublicFlightResult;
};

export function getCanonicalProviderFareOffers(
  offers: PublicFlightResult[],
  canonicalOffer: PublicFlightResult | undefined,
) {
  if (!canonicalOffer) return [];
  const canonicalProvider = canonicalOffer.provider.trim().toLowerCase();
  const matchingOffers = offers.filter(
    (offer) => offer.provider.trim().toLowerCase() === canonicalProvider,
  );
  return matchingOffers.some((offer) => offer.id === canonicalOffer.id)
    ? matchingOffers
    : [canonicalOffer, ...matchingOffers];
}

export function groupFareOffers(offers: PublicFlightResult[]): FareGroup[] {
  const groups = new Map<string, PublicFlightResult[]>();
  for (const offer of offers) {
    const providerBrand = offer.fareBrandName?.trim();
    const key = providerBrand
      ? `${offer.provider.trim().toLowerCase()}|${providerBrand.toLowerCase()}`
      : `exact-offer|${offer.id}`;
    groups.set(key, [...(groups.get(key) ?? []), offer]);
  }

  return [...groups.entries()]
    .map(([key, grouped]) => ({
      key,
      label: grouped[0].fareBrandName
        ? titleCase(grouped[0].fareBrandName)
        : `${titleCase(grouped[0].cabinClass || "Unknown")} fare`,
      offers: grouped.sort((a, b) => a.price - b.price),
      lowest: grouped.reduce((lowest, offer) =>
        offer.price < lowest.price ? offer : lowest,
      ),
    }))
    .sort((a, b) => a.lowest.price - b.lowest.price);
}

export function fareBenefits(flight: PublicFlightResult) {
  const value = flight.baggageInfo?.trim();
  if (!value || /vary|provider|review/i.test(value)) return [];
  return value.split(/,|•/).map((part) => part.trim()).filter(Boolean);
}

function titleCase(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
