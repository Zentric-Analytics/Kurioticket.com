import type { Prisma } from "@/generated/prisma/client";

export const ACCOUNT_DELETION_PAGE_SIZE = 25;

export const accountDeletionFilters = [
  { key: "open", label: "Pending + review", statuses: ["PENDING", "READY_FOR_REVIEW"] },
  { key: "pending", label: "Pending", statuses: ["PENDING"] },
  { key: "cancelled", label: "Cancelled / Reactivated", statuses: ["CANCELLED"] },
  { key: "ready", label: "Ready for review", statuses: ["READY_FOR_REVIEW"] },
  { key: "completed", label: "Completed", statuses: ["COMPLETED"] },
  { key: "all", label: "All" },
] as const;

export type AccountDeletionFilter = (typeof accountDeletionFilters)[number]["key"];
export type AccountDeletionSearchParams = { q?: string; status?: string; page?: string };

export function parseAccountDeletionSearchParams(params?: AccountDeletionSearchParams) {
  const q = params?.q?.trim() || "";
  const status = accountDeletionFilters.some((filter) => filter.key === params?.status)
    ? (params?.status as AccountDeletionFilter)
    : "open";
  const rawPage = params?.page || "1";
  const page = /^\d+$/.test(rawPage) && Number(rawPage) > 0 ? Number(rawPage) : 1;
  return { q, status, page };
}

export function buildAccountDeletionWhere(filters: { q: string; status: AccountDeletionFilter }): Prisma.AccountDeletionRequestWhereInput {
  const definition = accountDeletionFilters.find((filter) => filter.key === filters.status);
  return {
    ...(filters.q ? {
      OR: [
        { email: { contains: filters.q, mode: "insensitive" as const } },
        { id: { contains: filters.q, mode: "insensitive" as const } },
        { supportTicketId: { contains: filters.q, mode: "insensitive" as const } },
        { adminNotificationId: { contains: filters.q, mode: "insensitive" as const } },
        { user: { email: { contains: filters.q, mode: "insensitive" as const } } },
      ],
    } : {}),
    ...(definition && "statuses" in definition ? { status: { in: [...definition.statuses] } } : {}),
  };
}

export function buildAccountDeletionHref(page: number, filters: { q: string; status: AccountDeletionFilter }) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status !== "open") params.set("status", filters.status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/admin/account-deletions${query ? `?${query}` : ""}`;
}

export function getVisibleAccountDeletionPages(currentPage: number, totalPages: number) {
  const start = Math.max(1, Math.min(currentPage - 1, totalPages - 2));
  return Array.from({ length: Math.min(3, totalPages) }, (_, index) => start + index);
}
