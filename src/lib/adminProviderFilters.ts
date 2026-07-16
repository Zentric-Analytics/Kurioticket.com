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
