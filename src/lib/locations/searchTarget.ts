/** Portable web/native selection contract. It deliberately contains no secrets or runtime-only dependencies. */
export type SearchLocationKind = "airport" | "city" | "district" | "landmark" | "rental-area" | "custom";
export type SearchLocationBindingVerification = "verified" | "unverified";
export type SearchLocationBindingProvenance = "provider-discovery" | "catalogue" | "operator";
export type SearchLocationVerification = "verified" | "catalogue-only";

export type SearchLocationProviderBinding = {
  provider: string;
  value: string;
  kind?: string;
  verification: SearchLocationBindingVerification;
  provenance: SearchLocationBindingProvenance;
};

export type SearchLocation = {
  id: string;
  kind: SearchLocationKind;
  primaryLabel: string;
  supportingLabel: string;
  submittedValue: string;
  country?: { code?: string; name?: string };
  region?: string;
  coordinates?: { latitude: number; longitude: number };
  codes?: { iata?: string; icao?: string };
  providerBindings: SearchLocationProviderBinding[];
  verification: SearchLocationVerification;
};

export function verifiedProviderValue(location: SearchLocation | undefined, provider: string) {
  const matches = location?.providerBindings.filter((binding: SearchLocationProviderBinding) =>
    binding.provider.toLocaleLowerCase("en-US") === provider.toLocaleLowerCase("en-US") && binding.verification === "verified",
  ) ?? [];
  return matches.length === 1 ? matches[0].value : undefined;
}
