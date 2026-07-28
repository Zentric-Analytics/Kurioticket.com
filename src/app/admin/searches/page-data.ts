import type { Prisma } from "@/generated/prisma/client";

export const SEARCH_PAGE_SIZE = 25;
export const searchTypes = ["ALL", "FLIGHT", "HOTEL"] as const;
export const searchStatuses = ["ALL", "SUCCESS", "PARTIAL", "FAILED"] as const;
export const searchProviders = ["ALL", "FLIGHT", "HOTEL"] as const;
export const searchesTableColumns = ["Created", "Type", "Route / Stay", "Market", "Results", "Provider", "Status", "Latency"];

export type SearchTypeFilter = (typeof searchTypes)[number];
export type SearchStatusFilter = (typeof searchStatuses)[number];
export type SearchProviderFilter = (typeof searchProviders)[number];
export type SearchesSearchParams = { q?: string; type?: string; status?: string; provider?: string; page?: string };

export function parseSearchesSearchParams(params?: SearchesSearchParams) {
  const q = params?.q?.trim() || "";
  const type = searchTypes.includes(params?.type as SearchTypeFilter) ? params?.type as SearchTypeFilter : "ALL";
  const status = searchStatuses.includes(params?.status as SearchStatusFilter) ? params?.status as SearchStatusFilter : "ALL";
  const provider = searchProviders.includes(params?.provider as SearchProviderFilter) ? params?.provider as SearchProviderFilter : "ALL";
  const rawPage = params?.page || "1";
  const page = /^\d+$/.test(rawPage) && Number(rawPage) > 0 ? Number(rawPage) : 1;
  return { q, type, status, provider, page };
}

export function buildSearchesWhere(filters: ReturnType<typeof parseSearchesSearchParams>): Prisma.SearchHistoryWhereInput {
  return {
    ...(filters.q ? { OR: [
      { id: { contains: filters.q, mode: "insensitive" } },
      { origin: { contains: filters.q, mode: "insensitive" } },
      { destination: { contains: filters.q, mode: "insensitive" } },
      { query: { path: ["provider"], string_contains: filters.q } },
      { query: { path: ["market"], string_contains: filters.q } },
      { query: { path: ["country"], string_contains: filters.q } },
    ] } : {}),
    ...(filters.type !== "ALL" ? { type: filters.type } : {}),
    ...(filters.status !== "ALL" ? { status: filters.status } : {}),
    ...(filters.provider !== "ALL" ? { type: filters.provider } : {}),
  };
}

export function clampSearchesPage(requestedPage: number, total: number) {
  const totalPages = Math.max(1, Math.ceil(total / SEARCH_PAGE_SIZE));
  return { currentPage: Math.min(requestedPage, totalPages), totalPages };
}

export function buildSearchesHref(page: number, filters: Omit<ReturnType<typeof parseSearchesSearchParams>, "page">) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.type !== "ALL") params.set("type", filters.type);
  if (filters.status !== "ALL") params.set("status", filters.status);
  if (filters.provider !== "ALL") params.set("provider", filters.provider);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/admin/searches${query ? `?${query}` : ""}`;
}

export function latencyTone(latencyMs: number | null) {
  if (latencyMs === null) return "text-slate-400";
  if (latencyMs < 1000) return "text-emerald-700";
  if (latencyMs <= 3000) return "text-amber-700";
  return "text-rose-700";
}
