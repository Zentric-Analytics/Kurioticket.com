import type { Prisma } from "@/generated/prisma/client";

export const USER_PAGE_SIZE = 25;
export const validRoles = ["ALL", "USER", "SUPPORT", "ADMIN"] as const;
export const validStatuses = ["ALL", "ACTIVE", "SUSPENDED", "DELETED"] as const;
export const usersTableColumns = ["User", "Role", "Status", "Joined", { key: "actions", label: "Actions", align: "right" as const }];

export type UserRoleFilter = (typeof validRoles)[number];
export type UserStatusFilter = (typeof validStatuses)[number];
export type UserSearchParams = { q?: string; role?: string; status?: string; page?: string };

export function parseUserSearchParams(params?: UserSearchParams) {
  const q = params?.q?.trim() || "";
  const role = validRoles.includes(params?.role as UserRoleFilter) ? (params?.role as UserRoleFilter) : "ALL";
  const status = validStatuses.includes(params?.status as UserStatusFilter) ? (params?.status as UserStatusFilter) : "ALL";
  const rawPage = params?.page || "1";
  const page = /^\d+$/.test(rawPage) && Number(rawPage) > 0 ? Number(rawPage) : 1;

  return { q, role, status, page };
}

export function buildUserWhere({ q, role, status }: ReturnType<typeof parseUserSearchParams>): Prisma.UserWhereInput {
  return {
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(role !== "ALL" ? { role } : {}),
    ...(status !== "ALL" ? { status } : {}),
  };
}

export function clampUserPage(requestedPage: number, totalMatchingUsers: number) {
  const totalPages = Math.max(1, Math.ceil(totalMatchingUsers / USER_PAGE_SIZE));
  return { currentPage: Math.min(requestedPage, totalPages), totalPages };
}

export function buildUsersPaginationHref(page: number, filters: { q: string; role: UserRoleFilter; status: UserStatusFilter }) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.role !== "ALL") params.set("role", filters.role);
  if (filters.status !== "ALL") params.set("status", filters.status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}
