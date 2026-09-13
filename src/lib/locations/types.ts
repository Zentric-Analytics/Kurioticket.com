export const locationKinds = [
  "airport",
  "city",
  "district",
  "landmark",
  "rental-area",
  "custom",
] as const;

export type LocationKind = (typeof locationKinds)[number];
export type TravelProduct = "flights" | "hotels" | "cars" | "packages";
export type StaticCoverageLevel = "exact" | "broader" | "reference-only" | "none";

export type LocationProviderBinding = {
  /** Provider names are namespaces. This value is meaningful only to `provider`. */
  provider: string;
  value: string;
  kind?: string;
  verification: "verified" | "unverified";
  provenance: "provider-discovery" | "catalogue" | "operator";
};

export type CanonicalLocation = {
  /** Stable, Kurioticket-owned identity. Provider identifiers must never be used here. */
  id: string;
  kind: LocationKind;
  primaryLabel: string;
  supportingLabel: string;
  /** Exact value retained by existing forms and URL contracts. */
  submittedValue: string;
  country?: { code?: string; name?: string };
  region?: string;
  coordinates?: { latitude: number; longitude: number };
  codes?: { iata?: string; icao?: string };
  aliases?: readonly string[];
  localizedSearchTerms?: Readonly<Record<string, readonly string[]>>;
  staticCoverage: Readonly<Record<TravelProduct, StaticCoverageLevel>>;
  providerIds?: Readonly<Record<string, string>>;
  providerBindings?: readonly LocationProviderBinding[];
  verification?: "verified" | "catalogue-only";
  source: { catalog: "kurioticket"; datasetVersion: string };
};

export type LocationSearchMatch = {
  location: CanonicalLocation;
  tier: "code-exact" | "label-exact" | "prefix" | "word-prefix" | "substring" | "typo";
  score: number;
};
