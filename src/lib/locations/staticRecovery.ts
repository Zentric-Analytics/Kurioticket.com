import type { CanonicalLocation, StaticCoverageLevel, TravelProduct } from "./types";

export type StaticSearchResolution = {
  kind: "exact" | "broader" | "unverified" | "unsupported";
  canSubmit: boolean;
  coverage: StaticCoverageLevel | "unverified";
  message: string;
};

const productName: Record<TravelProduct, string> = {
  flights: "flight",
  hotels: "hotel",
  cars: "car",
  packages: "package",
};

export function resolveStaticSearch(input: {
  product: TravelProduct;
  location?: CanonicalLocation | null;
  typedValue?: string;
  allowUnverifiedText: boolean;
}): StaticSearchResolution {
  const coverage = input.location?.staticCoverage[input.product] ?? "none";
  if (coverage === "exact") {
    return { kind: "exact", canSubmit: true, coverage, message: `Exact ${productName[input.product]} catalogue match.` };
  }
  if (coverage === "broader") {
    return { kind: "broader", canSubmit: true, coverage, message: `Showing clearly labelled broader or nearby static matches.` };
  }
  if (input.allowUnverifiedText && input.typedValue?.trim()) {
    return { kind: "unverified", canSubmit: true, coverage: "unverified", message: "You can continue with this typed location. It is not provider-verified and static results may be unavailable." };
  }
  return { kind: "unsupported", canSubmit: false, coverage, message: "No verified static match is available. Try a city, airport, or location from the suggestions." };
}
