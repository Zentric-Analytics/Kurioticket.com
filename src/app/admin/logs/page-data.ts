import type { Prisma } from "@/generated/prisma/client";

export const ADMIN_LOG_PAGE_SIZE = 25;
export const adminLogsTableColumns = ["Created", "Admin", "Action", "Target", "Target Email", "IP", "Details"];

export type AdminLogsSearchParams = { q?: string; admin?: string; action?: string; page?: string };

export function parseAdminLogsSearchParams(params?: AdminLogsSearchParams) {
  const rawPage = params?.page || "1";
  return {
    q: params?.q?.trim() || "",
    admin: params?.admin?.trim() || "ALL",
    action: params?.action?.trim() || "ALL",
    page: /^\d+$/.test(rawPage) && Number(rawPage) > 0 ? Number(rawPage) : 1,
  };
}

export function buildAdminLogsWhere(filters: ReturnType<typeof parseAdminLogsSearchParams>): Prisma.AdminAuditLogWhereInput {
  return {
    ...(filters.q ? { OR: [
      { action: { contains: filters.q, mode: "insensitive" } },
      { adminEmail: { contains: filters.q, mode: "insensitive" } },
      { targetEmail: { contains: filters.q, mode: "insensitive" } },
      { targetType: { contains: filters.q, mode: "insensitive" } },
      { targetId: { contains: filters.q, mode: "insensitive" } },
      { ipAddress: { contains: filters.q, mode: "insensitive" } },
    ] } : {}),
    ...(filters.admin !== "ALL" ? { adminEmail: filters.admin } : {}),
    ...(filters.action !== "ALL" ? { action: filters.action } : {}),
  };
}

export function clampAdminLogsPage(requestedPage: number, total: number) {
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_LOG_PAGE_SIZE));
  return { currentPage: Math.min(requestedPage, totalPages), totalPages };
}

export function buildAdminLogsHref(page: number, filters: Omit<ReturnType<typeof parseAdminLogsSearchParams>, "page">) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.admin !== "ALL") params.set("admin", filters.admin);
  if (filters.action !== "ALL") params.set("action", filters.action);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/admin/logs${query ? `?${query}` : ""}`;
}

const actionLabels: Record<string, string> = {
  USER_HARD_DELETED: "User Permanently Deleted",
  "account_deletion.save_notes": "Account Deletion Notes Saved",
};

export function formatActionLabel(action: string) {
  if (actionLabels[action]) return actionLabels[action];
  return titleCase(action);
}

export function formatTargetType(targetType: string) {
  return titleCase(targetType) || "Unknown target";
}

export function formatTargetIdentifier(targetId: string | null) {
  if (!targetId) return "No identifier";
  if (/^[a-z][a-z\d ]{1,24}$/i.test(targetId)) return titleCase(targetId);
  if (targetId.length <= 14) return targetId;
  return `${targetId.slice(0, 8)}…${targetId.slice(-4)}`;
}

export function formatMetadata(metadata: unknown) {
  if (metadata === null || metadata === undefined || (typeof metadata === "object" && !Array.isArray(metadata) && Object.keys(metadata as object).length === 0)) return null;
  try {
    const formatted = JSON.stringify(metadata, null, 2);
    return formatted === undefined ? String(metadata) : formatted;
  } catch {
    return String(metadata);
  }
}

function titleCase(value: string) {
  return value.trim().replace(/[._:/-]+/g, " ").replace(/\s+/g, " ").toLowerCase().replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}
