import type { Prisma } from "@/generated/prisma/client";

export const REDIRECT_PAGE_SIZE = 25;
export const redirectStatuses = ["ALL", "RECORDED"] as const;
export const redirectsTableColumns = ["Route", "Provider", "Source Page", "Destination Domain", "Status", "Created"];
export type RedirectStatusFilter = (typeof redirectStatuses)[number];
export type RedirectsSearchParams = { q?: string; provider?: string; status?: string; page?: string };

export function parseRedirectsSearchParams(params?: RedirectsSearchParams) {
  const q = params?.q?.trim() || "";
  const provider = params?.provider?.trim() || "ALL";
  const status = redirectStatuses.includes(params?.status as RedirectStatusFilter) ? params?.status as RedirectStatusFilter : "ALL";
  const rawPage = params?.page || "1";
  const page = /^\d+$/.test(rawPage) && Number(rawPage) > 0 ? Number(rawPage) : 1;
  return { q, provider, status, page };
}

export function buildRedirectsWhere(filters: ReturnType<typeof parseRedirectsSearchParams>): Prisma.RedirectLogWhereInput {
  return {
    ...(filters.q ? { OR: [
      { id: { contains: filters.q, mode: "insensitive" } },
      { route: { contains: filters.q, mode: "insensitive" } },
      { provider: { contains: filters.q, mode: "insensitive" } },
      { sourcePage: { contains: filters.q, mode: "insensitive" } },
      { destinationUrl: { contains: filters.q, mode: "insensitive" } },
    ] } : {}),
    ...(filters.provider !== "ALL" ? { provider: filters.provider } : {}),
  };
}

export function clampRedirectsPage(requestedPage: number, total: number) {
  const totalPages = Math.max(1, Math.ceil(total / REDIRECT_PAGE_SIZE));
  return { currentPage: Math.min(requestedPage, totalPages), totalPages };
}

export function buildRedirectsHref(page: number, filters: Omit<ReturnType<typeof parseRedirectsSearchParams>, "page">) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.provider !== "ALL") params.set("provider", filters.provider);
  if (filters.status !== "ALL") params.set("status", filters.status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/admin/redirects${query ? `?${query}` : ""}`;
}

export function formatSourcePage(value: string) {
  return value.trim().split(/[_\s-]+/).filter(Boolean).map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`).join(" ") || "—";
}

export function formatDestinationDomain(destinationUrl: string) {
  try {
    const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(destinationUrl) ? destinationUrl : `https://${destinationUrl}`;
    return new URL(withProtocol).hostname.replace(/^www\./i, "") || "Invalid URL";
  } catch {
    return "Invalid URL";
  }
}
