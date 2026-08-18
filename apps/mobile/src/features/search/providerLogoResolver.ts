const providerLogos: Readonly<Record<string, string>> = {};

const normalizeProvider = (provider: string) =>
  provider.trim().toLocaleLowerCase().replace(/\s+/g, " ");

const normalizeCarrierIdentity = (identity: string) =>
  normalizeProvider(identity).replace(/\s+(?:airways|airlines)$/, "");

/** Treats a provider and its carrier-branded name as the same live identity. */
export function providerMatchesCarrier(provider: string, airlineName: string): boolean {
  return normalizeCarrierIdentity(provider) === normalizeCarrierIdentity(airlineName);
}

/** Resolves booking-provider identities without coupling screens to logo URLs. */
export function resolveProviderLogo(provider: string): string | null {
  return providerLogos[normalizeProvider(provider)] ?? null;
}
