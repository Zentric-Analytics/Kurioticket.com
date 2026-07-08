export type PublicHomepageFareDisplayCandidate = {
  price?: number;
  currency?: string;
  providerBacked?: boolean;
  searchedAt?: string;
  expiresAt?: string;
  search?: {
    origin: string;
    destination: string;
    currency: string;
  };
  priceState?: "fresh" | "last_known_good" | "none";
  cachedProviderBacked?: boolean;
};

export type FreshPublicHomepageFare<T extends PublicHomepageFareDisplayCandidate> = T & {
  price: number;
  currency: string;
  providerBacked: true;
  search: NonNullable<T["search"]>;
  expiresAt: string;
};

export function hasFreshProviderPrice<T extends PublicHomepageFareDisplayCandidate>(
  price: T | undefined,
  expectedRoute?: { originCode?: string; destinationCode?: string },
): price is FreshPublicHomepageFare<T> {
  if (
    price?.providerBacked !== true ||
    typeof price.price !== "number" ||
    !Number.isFinite(price.price) ||
    price.price <= 0 ||
    !price.currency ||
    !price.search ||
    !price.expiresAt
  ) {
    return false;
  }

  if (price.search.currency !== price.currency) return false;

  if (
    expectedRoute?.originCode &&
    price.search.origin.toUpperCase() !== expectedRoute.originCode.toUpperCase()
  ) {
    return false;
  }

  if (
    expectedRoute?.destinationCode &&
    price.search.destination.toUpperCase() !==
      expectedRoute.destinationCode.toUpperCase()
  ) {
    return false;
  }

  if (price.priceState && price.priceState !== "fresh") return false;

  const expiresAtMs = Date.parse(price.expiresAt);
  return (
    Number.isFinite(expiresAtMs) &&
    expiresAtMs > Date.now() &&
    price.cachedProviderBacked !== true
  );
}
