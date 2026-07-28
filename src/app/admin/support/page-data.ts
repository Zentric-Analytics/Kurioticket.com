export const SUPPORT_PAGE_SIZE = 25;

export const supportCategories = ["ALL", "account_deletion", "booking", "general", "payment", "technical"] as const;
export const supportStatuses = ["ALL", "OPEN", "WAITING_ON_USER", "WAITING_ON_TEAM", "RESOLVED", "CLOSED"] as const;

export type SupportCategoryFilter = string;
export type SupportStatusFilter = (typeof supportStatuses)[number];
export type SupportSearchParams = { q?: string; category?: string; status?: string; page?: string };

export function parseSupportSearchParams(params?: SupportSearchParams) {
  const q = params?.q?.trim() || "";
  const category = params?.category?.trim() || "ALL";
  const status = supportStatuses.includes(params?.status as SupportStatusFilter)
    ? (params?.status as SupportStatusFilter)
    : "ALL";
  const rawPage = params?.page || "1";
  const page = /^\d+$/.test(rawPage) && Number(rawPage) > 0 ? Number(rawPage) : 1;
  return { q, category, status, page };
}

export function buildSupportHref(page: number, filters: { q: string; category: string; status: SupportStatusFilter }) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category !== "ALL") params.set("category", filters.category);
  if (filters.status !== "ALL") params.set("status", filters.status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/support?${query}` : "/admin/support";
}

export function getVisibleSupportPages(currentPage: number, totalPages: number) {
  const start = Math.max(1, Math.min(currentPage - 1, totalPages - 2));
  return Array.from({ length: Math.min(3, totalPages) }, (_, index) => start + index);
}
