import type { CarSearchParams, NormalizedCarResult } from "@/lib/cars/types";
import { buildCarDetailsHref } from "@/lib/cars/carResults";
import type { PublicFlightResult, PublicHotelResult } from "@/lib/types";

export type TravelSearchMode = "live" | "demo" | "discovery";
export type TravelSearchStatus = "available" | "partial" | "empty" | "unavailable";
export type TravelResultAction =
  | { kind: "internal-detail"; href: string; enabled: true }
  | { kind: "provider"; href: string; enabled: true }
  | { kind: "none"; enabled: false };

export type TravelResultPolicy = {
  mode: TravelSearchMode;
  bookable: boolean;
  sourceLabel: string;
  action: TravelResultAction;
};

export type ContractResult<T> = T & { searchPolicy: TravelResultPolicy };
export type TravelSearchResponse<T> = {
  results: ContractResult<T>[];
  mode: TravelSearchMode;
  status: TravelSearchStatus;
  sourceLabel: string;
  warnings: string[];
  partial: boolean;
  requestId: string;
};

export function classifyFlights(results: PublicFlightResult[], fallback: boolean, warnings: string[], requestId: string): TravelSearchResponse<PublicFlightResult> {
  const mode: TravelSearchMode = fallback ? "demo" : "live";
  const classified = results.map((result) => ({
    ...result,
    searchPolicy: {
      mode,
      bookable: mode === "live",
      sourceLabel: result.provider,
      action: { kind: "internal-detail", href: `/flights/details/${encodeURIComponent(result.id)}`, enabled: true } as const,
    },
  }));
  const partial = Boolean(warnings.length);
  return { results: classified, mode, status: classified.length ? partial ? "partial" : "available" : "empty", sourceLabel: uniqueProviders(results), warnings, partial, requestId };
}

export function classifyHotels(results: PublicHotelResult[], fallback: boolean, warnings: string[], requestId: string): TravelSearchResponse<PublicHotelResult> {
  const hasLive = results.some((result) => result.inventoryKind !== "discovery" && result.dataSource !== "demo" && !fallback);
  const hasDemo = results.some((result) => result.dataSource === "demo" || (fallback && result.inventoryKind !== "discovery"));
  const mode: TravelSearchMode = hasLive ? "live" : hasDemo || fallback ? "demo" : "discovery";
  const classified = results.map((result) => {
    const discovery = result.inventoryKind === "discovery";
    const demo = !discovery && (result.dataSource === "demo" || fallback);
    return {
      ...result,
      searchPolicy: {
        mode: discovery ? "discovery" as const : demo ? "demo" as const : "live" as const,
        bookable: !discovery && !demo,
        sourceLabel: result.provider,
        action: { kind: "internal-detail", href: `/hotels/details/${encodeURIComponent(result.id)}`, enabled: true } as const,
      },
    };
  });
  const partial = Boolean(warnings.length || (hasLive && classified.some((result) => result.searchPolicy.mode !== "live")));
  return { results: classified, mode, status: classified.length ? partial ? "partial" : "available" : "empty", sourceLabel: uniqueProviders(results), warnings, partial, requestId };
}

export function classifyCars(results: NormalizedCarResult[], mode: "live" | "demo", status: "available" | "unavailable" | "invalid-search", sourceLabel: string, search: CarSearchParams, requestId: string): TravelSearchResponse<NormalizedCarResult> {
  const classified = results.map((result) => {
    const providerAction = mode === "live" ? result.offers.find((offer) => safeHttpUrl(offer.bookingUrl))?.bookingUrl : undefined;
    return {
      ...result,
      searchPolicy: {
        mode,
        bookable: mode === "live" && Boolean(providerAction),
        sourceLabel,
        action: providerAction
          ? { kind: "provider" as const, href: providerAction, enabled: true as const }
          : { kind: "internal-detail" as const, href: buildCarDetailsHref(result.id, search), enabled: true as const },
      },
    };
  });
  const responseStatus: TravelSearchStatus = status === "unavailable" ? "unavailable" : classified.length ? "available" : "empty";
  const warnings = mode === "demo" && classified.length ? ["Sample car listings — live booking is not yet available."] : [];
  return { results: classified, mode, status: responseStatus, sourceLabel, warnings, partial: false, requestId };
}

function uniqueProviders(results: Array<{ provider: string }>) {
  return [...new Set(results.map((result) => result.provider).filter(Boolean))].join(", ");
}

function safeHttpUrl(value?: string) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || (process.env.NODE_ENV !== "production" && url.protocol === "http:");
  } catch {
    return false;
  }
}
