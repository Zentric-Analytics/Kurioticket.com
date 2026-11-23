import type { getProviderStatuses } from "@/lib/admin-data";

export type ProductFilter = "all" | "flights" | "hotels" | "cars";
export type ProviderProduct = "Flights" | "Hotels" | "Cars";
export type AdminProviderStatus = Awaited<ReturnType<typeof getProviderStatuses>>[number];

export const productFilters: Array<{ key: ProductFilter; label: string; href: string }> = [
  { key: "all", label: "All", href: "/admin/providers" },
  { key: "flights", label: "Flights", href: "/admin/providers?product=flights" },
  { key: "hotels", label: "Hotels", href: "/admin/providers?product=hotels" },
  { key: "cars", label: "Cars", href: "/admin/providers?product=cars" },
];

const productByFilter: Record<Exclude<ProductFilter, "all">, ProviderProduct> = {
  flights: "Flights",
  hotels: "Hotels",
  cars: "Cars",
};

export function normalizeProductFilter(value?: string | string[]): ProductFilter {
  const product = Array.isArray(value) ? value[0] : value;
  return product === "flights" || product === "hotels" || product === "cars" ? product : "all";
}

export function filterProviderStatuses(providers: AdminProviderStatus[], filter: ProductFilter) {
  if (filter === "all") return providers;
  return providers.filter((provider) => provider.product === productByFilter[filter]);
}

import type { ProviderOperationalStatus, ProviderOperationalServiceStatus } from "@/services/providerOperationalStatusCore";

const serviceByFilter: Record<Exclude<ProductFilter, "all">, string> = {
  flights: "flight-search",
  hotels: "hotel-search",
  cars: "car-search",
};

/** Recalculate only additive, service-scoped metrics. Never present provider-wide
 * latency or timestamps as if they described a selected product. */
export function filterProviderOperationalStatuses(
  statuses: ProviderOperationalStatus[],
  filter: ProductFilter,
): ProviderOperationalStatus[] {
  if (filter === "all") return statuses;
  const serviceName = serviceByFilter[filter];
  return statuses.flatMap(provider => {
    const service = provider.serviceBreakdown.find(item => item.service === serviceName);
    if (!service) return [];
    const singleService = provider.serviceBreakdown.length === 1
      && provider.serviceBreakdown[0]?.service === serviceName;
    return [{
      ...provider,
      operationalState: service.operationalState,
      serviceBreakdown: [service] as ProviderOperationalServiceStatus[],
      totalCalls: service.totalCalls,
      attemptedCalls: service.attemptedCalls,
      successCalls: service.successCalls,
      degradedCalls: service.degradedCalls,
      failedCalls: service.failedCalls,
      disabledCalls: service.disabledCalls,
      failureRatePct: service.failureRatePct,
      // A single-service provider is already scoped to this product. Preserve
      // genuine timing data; multi-service timings cannot be product-attributed.
      averageLatencyMs: singleService ? provider.averageLatencyMs : null,
      lastActivityAt: singleService ? provider.lastActivityAt : null,
      lastSuccessAt: singleService ? provider.lastSuccessAt : null,
      lastFailureAt: singleService ? provider.lastFailureAt : null,
      lastAdverseAt: singleService ? provider.lastAdverseAt : null,
    }];
  });
}
