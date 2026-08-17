const providerLogos: Readonly<Record<string, string>> = {};

const normalizeProvider = (provider: string) =>
  provider.trim().toLocaleLowerCase().replace(/\s+/g, " ");

/** Resolves booking-provider identities without coupling screens to logo URLs. */
export function resolveProviderLogo(provider: string): string | null {
  return providerLogos[normalizeProvider(provider)] ?? null;
}
