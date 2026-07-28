import type { PublicFlightResult, PublicHotelResult } from "@/lib/types";

export type DealsProviderHandoffUnavailableReason =
  | "missing_id"
  | "missing_target"
  | "unsafe_target"
  | "discovery_inventory"
  | "demo_inventory";

export type DealsProviderHandoff =
  | { available: true; href: string; provider: string }
  | { available: false; reason: DealsProviderHandoffUnavailableReason };

type HandoffResult = Pick<PublicFlightResult, "id" | "provider" | "partnerRedirectUrl" | "bookingUrl"> & {
  dataSource?: "demo" | "live";
  inventoryKind?: "bookable" | "discovery";
};

export function buildDealsInternalRedirectHref(id: string, type: "flight" | "hotel"): string | null {
  if (typeof id !== "string" || !id.trim()) return null;
  return `/redirect?${new URLSearchParams({ id: id.trim(), type }).toString()}`;
}

const isSafeExternalTarget = (target: string) => {
  try {
    const url = new URL(target);
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
};

/**
 * Presentation-only eligibility for an exact Deals result handoff. The redirect
 * API remains authoritative and repeats all cache, inventory, and URL checks.
 */
export function getDealsProviderHandoff(
  result: PublicFlightResult | PublicHotelResult,
  type: "flight" | "hotel",
): DealsProviderHandoff {
  const candidate = result as HandoffResult;
  if (typeof candidate.id !== "string" || !candidate.id.trim()) return { available: false, reason: "missing_id" };
  if (type === "hotel" && candidate.inventoryKind === "discovery") return { available: false, reason: "discovery_inventory" };
  if (candidate.dataSource === "demo") return { available: false, reason: "demo_inventory" };

  const target = [candidate.partnerRedirectUrl, candidate.bookingUrl]
    .find((value): value is string => typeof value === "string" && Boolean(value.trim()))
    ?.trim();
  if (!target) return { available: false, reason: "missing_target" };
  if (!isSafeExternalTarget(target)) return { available: false, reason: "unsafe_target" };

  const href = buildDealsInternalRedirectHref(candidate.id, type);
  return { available: true, href: href!, provider: candidate.provider?.trim() ?? "" };
}
